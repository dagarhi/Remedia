import {
  isoDate,
  queryString,
  languageName,
  unique,
  yearOf,
  type Provider,
  type ProviderContext,
  type ProviderRecord,
  type SearchResult,
} from "./types";

/* The Movie Database: movies and series. Needs the user's API key or Read Access Token. */

const API = "https://api.themoviedb.org/3";
const IMAGES = "https://image.tmdb.org/t/p/w500";

type Json = Record<string, any>;

/** Read Access Tokens are JWTs ("eyJ…") and go in a header; v3 API keys go in the URL. */
function request(ctx: ProviderContext, path: string, params: Record<string, string> = {}) {
  const token = ctx.credentials.tmdb.token.trim();
  const isBearer = token.startsWith("eyJ");
  const query = queryString({
    language: ctx.language === "es" ? "es-ES" : "en-US",
    ...params,
    ...(isBearer ? {} : { api_key: token }),
  });
  return ctx.http.getJson(`${API}${path}?${query}`, isBearer ? { Authorization: `Bearer ${token}` } : {}) as Promise<Json>;
}

const poster = (path: string | null | undefined) => (path ? `${IMAGES}${path}` : null);
const names = (list: Json[] | undefined, limit?: number) => unique((list ?? []).map((x) => x.name), limit);

const SHOW_STATUS: Record<string, string> = {
  "Returning Series": "returning",
  "In Production": "returning",
  Planned: "returning",
  Ended: "ended",
  Canceled: "cancelled",
  Cancelled: "cancelled",
};

function mapMovie(ctx: ProviderContext, m: Json): ProviderRecord {
  const crew: Json[] = m.credits?.crew ?? [];
  return {
    values: {
      title: m.title,
      original_title: m.original_title !== m.title ? m.original_title : null,
      fields: {
        release_date: isoDate(m.release_date),
        director: names(crew.filter((c) => c.job === "Director")),
        runtime: m.runtime || undefined,
        genres: names(m.genres),
        synopsis: m.overview || undefined,
        cast: names(m.credits?.cast, 8),
        writers: names(crew.filter((c) => c.department === "Writing"), 6),
        original_language: languageName(m.original_language, ctx.language),
      },
    },
    links: [
      { provider: "tmdb:movie", external_id: String(m.id) },
      ...(m.external_ids?.imdb_id || m.imdb_id
        ? [{ provider: "imdb", external_id: m.external_ids?.imdb_id ?? m.imdb_id }]
        : []),
    ],
    posterUrl: poster(m.poster_path),
  };
}

function mapSeries(ctx: ProviderContext, s: Json): ProviderRecord {
  return {
    values: {
      title: s.name,
      original_title: s.original_name !== s.name ? s.original_name : null,
      fields: {
        first_air_date: isoDate(s.first_air_date),
        creators: names(s.created_by),
        network: names(s.networks, 1)[0],
        show_status: SHOW_STATUS[s.status],
        genres: names(s.genres),
        synopsis: s.overview || undefined,
        cast: names(s.credits?.cast, 8),
        original_language: languageName(s.original_language, ctx.language),
      },
    },
    links: [
      { provider: "tmdb:tv", external_id: String(s.id) },
      ...(s.external_ids?.imdb_id ? [{ provider: "imdb", external_id: s.external_ids.imdb_id }] : []),
    ],
    posterUrl: poster(s.poster_path),
    // Season 0 holds specials; it is left out.
    seasons: (s.seasons ?? [])
      .filter((x: Json) => x.season_number > 0)
      .map((x: Json) => ({
        number: x.season_number,
        title: x.name,
        episodeCount: x.episode_count ?? null,
        airDate: isoDate(x.air_date) ?? null,
        posterUrl: poster(x.poster_path),
      })),
  };
}

export const tmdb: Provider = {
  id: "tmdb",
  templates: ["movie", "series"],
  needsCredentials: true,
  isConfigured: (c) => c.tmdb.token.trim() !== "",

  async search(ctx, template, query) {
    const isMovie = template === "movie";
    const data = await request(ctx, isMovie ? "/search/movie" : "/search/tv", { query });
    return ((data.results as Json[]) ?? []).slice(0, 20).map(
      (r): SearchResult => ({
        provider: "tmdb",
        linkProvider: isMovie ? "tmdb:movie" : "tmdb:tv",
        externalId: String(r.id),
        title: isMovie ? r.title : r.name,
        originalTitle: (isMovie ? r.original_title : r.original_name) ?? null,
        year: yearOf(isMovie ? r.release_date : r.first_air_date),
        extra: null,
        posterUrl: poster(r.poster_path),
      }),
    );
  },

  async details(ctx, template, result) {
    const isMovie = template === "movie";
    const data = await request(ctx, `${isMovie ? "/movie" : "/tv"}/${result.externalId}`, {
      append_to_response: "credits,external_ids",
    });
    return isMovie ? mapMovie(ctx, data) : mapSeries(ctx, data);
  },
};
