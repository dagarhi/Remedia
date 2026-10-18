import { parseProviderManifest } from "../manifest";
import manifest from "./manifest.json";
import { isoDate, queryString, unique, type Provider, type SearchResult } from "../types";

/* Jikan: MyAnimeList data for anime and manga. No key needed (rate limited: a few requests per second). */

const API = "https://api.jikan.moe/v4";

type Json = Record<string, any>;

const ANIME_FORMAT: Record<string, string> = {
  TV: "tv",
  "TV Special": "special",
  Special: "special",
  Movie: "movie_format",
  OVA: "ova",
  ONA: "ona",
};

const MANGA_FORMAT: Record<string, string> = {
  Manga: "manga",
  Manhwa: "manhwa",
  Manhua: "manhua",
  "One-shot": "one_shot",
};

const PUBLISHING_STATUS: Record<string, string> = {
  Publishing: "manga_publishing",
  Finished: "manga_finished",
  "On Hiatus": "manga_hiatus",
  Discontinued: "manga_cancelled",
};

/** Light novels are books (decided 2026-10-18), so manga searches leave them out. */
const NOVEL_TYPES = ["Novel", "Light Novel"];

/** MAL synopses end with a credit line like "[Written by MAL Rewrite]". */
const synopsis = (text: string | null | undefined) =>
  text?.replace(/\s*\[Written by [^\]]*\]\s*$/i, "").trim() || undefined;

/** MAL writes people as "Oda, Eiichiro"; AniList and the rest as "Eiichiro Oda". */
const personName = (name: string) => name.split(", ").reverse().join(" ");

const authorsOf = (m: Json): string[] => unique(((m.authors as Json[]) ?? []).map((a) => personName(a.name ?? "")));

const isManga = (template: string) => template === "manga";

export const jikan: Provider = {
  id: "jikan",
  manifest: parseProviderManifest(manifest),

  async search(ctx, template, query) {
    const manga = isManga(template);
    const params = queryString({ q: query, limit: "20", sfw: "true" });
    const data = (await ctx.http.getJson(`${API}/${manga ? "manga" : "anime"}?${params}`)) as Json;
    const items = ((data.data as Json[]) ?? []).filter((a) => !manga || !NOVEL_TYPES.includes(a.type));
    return items.map(
      (a): SearchResult => ({
        provider: "jikan",
        linkProvider: manga ? "myanimelist:manga" : "myanimelist",
        externalId: String(a.mal_id),
        title: a.title_english || a.title,
        originalTitle: a.title_japanese ?? null,
        year: (manga ? a.published?.from : a.aired?.from)?.slice(0, 4) ?? null,
        extra:
          unique([...(manga ? authorsOf(a) : (a.studios ?? []).map((s: Json) => s.name)), a.type], 3).join(" · ") || null,
        posterUrl: a.images?.jpg?.image_url ?? null,
        hints: a,
      }),
    );
  },

  // The search hit already has everything, so no second request (kinder to the rate limit).
  async details(_ctx, template, result) {
    const manga = isManga(template);
    const a = (result.hints ?? {}) as Json;
    const title = a.title_english || a.title || result.title;
    const common = {
      genres: unique((a.genres ?? []).map((g: Json) => g.name)),
      synopsis: synopsis(a.synopsis),
      original_title_romaji: a.title && a.title !== title ? a.title : undefined,
    };
    return {
      values: {
        title,
        original_title: a.title_japanese && a.title_japanese !== title ? a.title_japanese : null,
        fields: manga
          ? {
              publication_date: isoDate(a.published?.from),
              author: authorsOf(a),
              manga_format: MANGA_FORMAT[a.type],
              publishing_status: PUBLISHING_STATUS[a.status],
              chapter_count: a.chapters || undefined,
              volume_count: a.volumes || undefined,
              ...common,
            }
          : {
              first_air_date: isoDate(a.aired?.from),
              studios: unique((a.studios ?? []).map((s: Json) => s.name)),
              anime_format: ANIME_FORMAT[a.type],
              episode_count: a.episodes || undefined,
              ...common,
            },
      },
      // The same links AniList records, so either one spots the other's entries.
      links: [{ provider: manga ? "myanimelist:manga" : "myanimelist", external_id: result.externalId }],
      posterUrl: a.images?.jpg?.large_image_url ?? result.posterUrl,
    };
  },
};
