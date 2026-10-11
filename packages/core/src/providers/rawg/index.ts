import { parseProviderManifest } from "../manifest";
import manifest from "./manifest.json";
import { credential, isoDate, queryString, unique, yearOf, type Provider, type SearchResult } from "../types";

/* RAWG: video games. Needs a free API key. Its images are wide screenshots, not boxes. */

const API = "https://api.rawg.io/api";

type Json = Record<string, any>;

const platforms = (game: Json) => unique((game.platforms ?? []).map((p: Json) => p.platform?.name));

export const rawg: Provider = {
  id: "rawg",
  manifest: parseProviderManifest(manifest),

  async search(ctx, _template, query) {
    const key = credential(ctx.credentials, "rawg", "key");
    const data = (await ctx.http.getJson(
      `${API}/games?${queryString({ key, search: query, page_size: "20", search_precise: "true" })}`,
    )) as Json;
    return ((data.results as Json[]) ?? []).map(
      (g): SearchResult => ({
        provider: "rawg",
        linkProvider: "rawg",
        externalId: String(g.id),
        title: g.name,
        originalTitle: null,
        year: yearOf(g.released),
        extra: platforms(g).slice(0, 3).join(", ") || null,
        posterUrl: g.background_image ?? null,
      }),
    );
  },

  async details(ctx, _template, result) {
    const key = credential(ctx.credentials, "rawg", "key");
    const g = (await ctx.http.getJson(`${API}/games/${result.externalId}?${queryString({ key })}`)) as Json;
    return {
      values: {
        title: g.name,
        original_title: g.name_original && g.name_original !== g.name ? g.name_original : null,
        fields: {
          release_date: isoDate(g.released),
          developers: unique((g.developers ?? []).map((d: Json) => d.name)),
          publishers: unique((g.publishers ?? []).map((p: Json) => p.name)),
          platforms: platforms(g),
          genres: unique((g.genres ?? []).map((x: Json) => x.name)),
          synopsis: g.description_raw || undefined,
        },
      },
      links: [{ provider: "rawg", external_id: String(g.id) }],
      posterUrl: g.background_image ?? result.posterUrl,
    };
  },
};
