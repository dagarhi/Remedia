import { parseProviderManifest } from "../manifest";
import manifest from "./manifest.json";
import { unique, type Provider, type ProviderContext, type SearchResult } from "../types";

/* AniList: anime and manga, through its GraphQL API. No key needed. */

const API = "https://graphql.anilist.co";

type Json = Record<string, any>;

const COMMON_FIELDS = `
  id idMal
  title { romaji english native }
  startDate { year month day }
  coverImage { extraLarge large }
  format`;

const ANIME_FIELDS = `${COMMON_FIELDS}
  studios(isMain: true) { nodes { name } }
  episodes`;

const MANGA_FIELDS = `${COMMON_FIELDS}
  staff(perPage: 6, sort: RELEVANCE) { edges { role node { name { full } } } }
  countryOfOrigin status chapters volumes`;

// Light novels are books (decided 2026-10-18), so manga searches leave them out.
const searchQuery = (fields: string) => `query ($search: String, $type: MediaType, $formatNot: MediaFormat) {
  Page(perPage: 20) { media(search: $search, type: $type, format_not: $formatNot, sort: SEARCH_MATCH) { ${fields} } }
}`;

const detailsQuery = (fields: string) => `query ($id: Int, $type: MediaType) {
  Media(id: $id, type: $type) { ${fields} genres description(asHtml: false) }
}`;

const ANIME_FORMAT: Record<string, string> = {
  TV: "tv",
  TV_SHORT: "tv",
  MOVIE: "movie_format",
  OVA: "ova",
  ONA: "ona",
  SPECIAL: "special",
};

const PUBLISHING_STATUS: Record<string, string> = {
  RELEASING: "manga_publishing",
  FINISHED: "manga_finished",
  HIATUS: "manga_hiatus",
  CANCELLED: "manga_cancelled",
};

/** AniList calls every comic MANGA; the country tells manhwa (Korea) and manhua (China, Taiwan) apart. */
function mangaFormat(m: Json): string | undefined {
  if (m.format === "ONE_SHOT") return "one_shot";
  if (m.format !== "MANGA") return undefined;
  if (m.countryOfOrigin === "KR") return "manhwa";
  if (m.countryOfOrigin === "CN" || m.countryOfOrigin === "TW") return "manhua";
  return "manga";
}

/** Writers and artists ("Story & Art", "Story", "Art"), not translators or editors. */
const authorsOf = (m: Json): string[] =>
  unique(
    ((m.staff?.edges as Json[]) ?? [])
      .filter((e) => /story|art|original creator/i.test(e.role ?? ""))
      .map((e) => e.node?.name?.full),
  );

async function query(ctx: ProviderContext, gql: string, variables: Json): Promise<Json> {
  const response = (await ctx.http.postJson(API, { query: gql, variables })) as Json;
  return response.data ?? {};
}

/** { year: 2013, month: 4, day: 7 } -> "2013-04-07", at the known precision. */
function date(d: Json | null | undefined): string | undefined {
  if (!d?.year) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d.month ? (d.day ? `${d.year}-${pad(d.month)}-${pad(d.day)}` : `${d.year}-${pad(d.month)}`) : String(d.year);
}

/** AniList descriptions may contain HTML line breaks and tags. */
const plain = (html: string | null | undefined) =>
  html ? html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim() || undefined : undefined;

/** English title when there is one, otherwise romaji. */
const titleOf = (m: Json) => m.title?.english || m.title?.romaji || m.title?.native;

const isManga = (template: string) => template === "manga";

export const aniList: Provider = {
  id: "anilist",
  manifest: parseProviderManifest(manifest),

  async search(ctx, template, text) {
    const manga = isManga(template);
    const data = await query(ctx, searchQuery(manga ? MANGA_FIELDS : ANIME_FIELDS), {
      search: text,
      type: manga ? "MANGA" : "ANIME",
      formatNot: manga ? "NOVEL" : null,
    });
    return ((data.Page?.media as Json[]) ?? []).map(
      (m): SearchResult => ({
        provider: "anilist",
        linkProvider: "anilist",
        externalId: String(m.id),
        title: titleOf(m),
        originalTitle: m.title?.native ?? null,
        year: m.startDate?.year ? String(m.startDate.year) : null,
        extra:
          unique([...(manga ? authorsOf(m) : (m.studios?.nodes ?? []).map((s: Json) => s.name)), m.format], 3).join(" · ") ||
          null,
        posterUrl: m.coverImage?.large ?? null,
      }),
    );
  },

  async details(ctx, template, result) {
    const manga = isManga(template);
    const m = (
      await query(ctx, detailsQuery(manga ? MANGA_FIELDS : ANIME_FIELDS), {
        id: Number(result.externalId),
        type: manga ? "MANGA" : "ANIME",
      })
    ).Media as Json;
    const title = titleOf(m);
    const common = {
      genres: unique(m.genres ?? []),
      synopsis: plain(m.description),
      original_title_romaji: m.title?.romaji && m.title.romaji !== title ? m.title.romaji : undefined,
    };
    return {
      values: {
        title,
        original_title: m.title?.native && m.title.native !== title ? m.title.native : null,
        fields: manga
          ? {
              publication_date: date(m.startDate),
              author: authorsOf(m),
              manga_format: mangaFormat(m),
              publishing_status: PUBLISHING_STATUS[m.status],
              chapter_count: m.chapters || undefined,
              volume_count: m.volumes || undefined,
              ...common,
            }
          : {
              first_air_date: date(m.startDate),
              studios: unique((m.studios?.nodes ?? []).map((s: Json) => s.name)),
              anime_format: ANIME_FORMAT[m.format],
              episode_count: m.episodes || undefined,
              ...common,
            },
      },
      // AniList ids are shared by anime and manga; MyAnimeList numbers them separately.
      links: [
        { provider: "anilist", external_id: String(m.id) },
        ...(m.idMal ? [{ provider: manga ? "myanimelist:manga" : "myanimelist", external_id: String(m.idMal) }] : []),
      ],
      posterUrl: m.coverImage?.extraLarge ?? m.coverImage?.large ?? result.posterUrl,
    };
  },
};
