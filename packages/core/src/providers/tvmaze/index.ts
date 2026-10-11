import { parseProviderManifest } from "../manifest";
import manifest from "./manifest.json";
import { isoDate, stripHtml, unique, yearOf, type Provider, type SearchResult } from "../types";

/* TVmaze: series, with seasons. No key needed; data is in English. */

const API = "https://api.tvmaze.com";

type Json = Record<string, any>;

const SHOW_STATUS: Record<string, string> = {
  Running: "returning",
  "To Be Determined": "returning",
  "In Development": "returning",
  Ended: "ended",
};

export const tvmaze: Provider = {
  id: "tvmaze",
  manifest: parseProviderManifest(manifest),

  async search(ctx, _template, query) {
    const hits = (await ctx.http.getJson(`${API}/search/shows?q=${encodeURIComponent(query)}`)) as Json[];
    return (hits ?? []).map(({ show }): SearchResult => ({
      provider: "tvmaze",
      linkProvider: "tvmaze",
      externalId: String(show.id),
      title: show.name,
      originalTitle: null,
      year: yearOf(show.premiered),
      extra: unique([show.network?.name ?? show.webChannel?.name]).join("") || null,
      posterUrl: show.image?.medium ?? null,
    }));
  },

  async details(ctx, _template, result) {
    const show = (await ctx.http.getJson(
      `${API}/shows/${result.externalId}?embed%5B%5D=seasons&embed%5B%5D=cast&embed%5B%5D=crew`,
    )) as Json;
    const embedded = show._embedded ?? {};
    return {
      values: {
        title: show.name,
        fields: {
          first_air_date: isoDate(show.premiered),
          creators: unique((embedded.crew ?? []).filter((c: Json) => c.type === "Creator").map((c: Json) => c.person?.name)),
          network: show.network?.name ?? show.webChannel?.name ?? undefined,
          show_status: SHOW_STATUS[show.status],
          genres: unique(show.genres ?? []),
          synopsis: stripHtml(show.summary),
          cast: unique((embedded.cast ?? []).map((c: Json) => c.person?.name), 8),
          original_language: show.language ?? undefined,
        },
      },
      // The IMDb id lets the app notice the same series added from TMDB (data model, duplicates).
      links: [
        { provider: "tvmaze", external_id: String(show.id) },
        ...(show.externals?.imdb ? [{ provider: "imdb", external_id: show.externals.imdb }] : []),
      ],
      posterUrl: show.image?.original ?? result.posterUrl,
      seasons: (embedded.seasons ?? [])
        .filter((s: Json) => s.number > 0)
        .map((s: Json) => ({
          number: s.number,
          title: s.name || "",
          episodeCount: s.episodeOrder ?? null,
          airDate: isoDate(s.premiereDate) ?? null,
          posterUrl: s.image?.original ?? null,
        })),
    };
  },
};
