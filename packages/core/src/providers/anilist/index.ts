import { parseProviderManifest } from "../manifest";
import manifest from "./manifest.json";
import { unique, type Provider, type ProviderContext, type SearchResult } from "../types";

/* AniList: anime, through its GraphQL API. No key needed. */

const API = "https://graphql.anilist.co";

type Json = Record<string, any>;

const MEDIA_FIELDS = `
  id idMal
  title { romaji english native }
  startDate { year month day }
  coverImage { extraLarge large }
  studios(isMain: true) { nodes { name } }
  format episodes`;

const SEARCH = `query ($search: String) {
  Page(perPage: 20) { media(search: $search, type: ANIME, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} } }
}`;

const DETAILS = `query ($id: Int) {
  Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} genres description(asHtml: false) }
}`;

const FORMAT: Record<string, string> = {
  TV: "tv",
  TV_SHORT: "tv",
  MOVIE: "movie_format",
  OVA: "ova",
  ONA: "ona",
  SPECIAL: "special",
};

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

export const aniList: Provider = {
  id: "anilist",
  manifest: parseProviderManifest(manifest),

  async search(ctx, _template, search) {
    const data = await query(ctx, SEARCH, { search });
    return ((data.Page?.media as Json[]) ?? []).map(
      (m): SearchResult => ({
        provider: "anilist",
        linkProvider: "anilist",
        externalId: String(m.id),
        title: titleOf(m),
        originalTitle: m.title?.native ?? null,
        year: m.startDate?.year ? String(m.startDate.year) : null,
        extra: unique([...(m.studios?.nodes ?? []).map((s: Json) => s.name), m.format], 3).join(" · ") || null,
        posterUrl: m.coverImage?.large ?? null,
      }),
    );
  },

  async details(ctx, _template, result) {
    const m = (await query(ctx, DETAILS, { id: Number(result.externalId) })).Media as Json;
    const title = titleOf(m);
    return {
      values: {
        title,
        original_title: m.title?.native && m.title.native !== title ? m.title.native : null,
        fields: {
          first_air_date: date(m.startDate),
          studios: unique((m.studios?.nodes ?? []).map((s: Json) => s.name)),
          anime_format: FORMAT[m.format],
          episode_count: m.episodes || undefined,
          genres: unique(m.genres ?? []),
          synopsis: plain(m.description),
          original_title_romaji: m.title?.romaji && m.title.romaji !== title ? m.title.romaji : undefined,
        },
      },
      links: [
        { provider: "anilist", external_id: String(m.id) },
        ...(m.idMal ? [{ provider: "myanimelist", external_id: String(m.idMal) }] : []),
      ],
      posterUrl: m.coverImage?.extraLarge ?? m.coverImage?.large ?? result.posterUrl,
    };
  },
};
