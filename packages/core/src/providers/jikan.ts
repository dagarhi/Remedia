import { isoDate, queryString, unique, type Provider, type SearchResult } from "./types";

/* Jikan: MyAnimeList data for anime. No key needed (rate limited: a few requests per second). */

const API = "https://api.jikan.moe/v4";

type Json = Record<string, any>;

const FORMAT: Record<string, string> = {
  TV: "tv",
  "TV Special": "special",
  Special: "special",
  Movie: "movie_format",
  OVA: "ova",
  ONA: "ona",
};

/** MAL synopses end with a credit line like "[Written by MAL Rewrite]". */
const synopsis = (text: string | null | undefined) =>
  text?.replace(/\s*\[Written by [^\]]*\]\s*$/i, "").trim() || undefined;

export const jikan: Provider = {
  id: "jikan",
  templates: ["anime"],
  credentials: null,

  async search(ctx, _template, query) {
    const data = (await ctx.http.getJson(`${API}/anime?${queryString({ q: query, limit: "20", sfw: "true" })}`)) as Json;
    return ((data.data as Json[]) ?? []).map(
      (a): SearchResult => ({
        provider: "jikan",
        linkProvider: "myanimelist",
        externalId: String(a.mal_id),
        title: a.title_english || a.title,
        originalTitle: a.title_japanese ?? null,
        year: a.aired?.from ? a.aired.from.slice(0, 4) : null,
        extra: unique([...(a.studios ?? []).map((s: Json) => s.name), a.type], 3).join(" · ") || null,
        posterUrl: a.images?.jpg?.image_url ?? null,
        hints: a,
      }),
    );
  },

  // The search hit already has everything, so no second request (kinder to the rate limit).
  async details(_ctx, _template, result) {
    const a = (result.hints ?? {}) as Json;
    const title = a.title_english || a.title || result.title;
    return {
      values: {
        title,
        original_title: a.title_japanese && a.title_japanese !== title ? a.title_japanese : null,
        fields: {
          first_air_date: isoDate(a.aired?.from),
          studios: unique((a.studios ?? []).map((s: Json) => s.name)),
          anime_format: FORMAT[a.type],
          episode_count: a.episodes || undefined,
          genres: unique((a.genres ?? []).map((g: Json) => g.name)),
          synopsis: synopsis(a.synopsis),
          original_title_romaji: a.title && a.title !== title ? a.title : undefined,
        },
      },
      // "myanimelist" is the same link AniList records, so either one spots the other's entries.
      links: [{ provider: "myanimelist", external_id: result.externalId }],
      posterUrl: a.images?.jpg?.large_image_url ?? result.posterUrl,
    };
  },
};
