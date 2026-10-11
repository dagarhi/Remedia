import { describe, expect, it } from "vitest";
import { aniList } from "./anilist";
import { providersFor } from "./index";
import { openLibrary } from "./openlibrary";
import { tmdb } from "./tmdb";
import type { HttpClient, ProviderContext } from "./types";

/** A fake HTTP client: answers by URL prefix and remembers the requests. */
function fakeHttp(answers: Record<string, unknown>) {
  const calls: { url: string; headers?: Record<string, string>; body?: unknown }[] = [];
  const answer = (url: string) => {
    const key = Object.keys(answers).find((k) => url.startsWith(k));
    if (!key) throw new Error(`Unexpected request ${url}`);
    return answers[key];
  };
  const http: HttpClient = {
    getJson: async (url, headers) => (calls.push({ url, headers }), answer(url)),
    postJson: async (url, body, headers) => (calls.push({ url, body, headers }), answer(url)),
    postText: async (url, body, headers) => (calls.push({ url, body, headers }), answer(url)),
  };
  return { http, calls };
}

const ctx = (http: HttpClient, token = "v3key"): ProviderContext => ({
  http,
  language: "es",
  credentials: { tmdb: { token }, igdb: { client_id: "", client_secret: "" } },
});

describe("tmdb", () => {
  it("searches movies with the v3 key in the URL and the app language", async () => {
    const { http, calls } = fakeHttp({
      "https://api.themoviedb.org/3/search/movie": {
        results: [{ id: 329865, title: "La llegada", original_title: "Arrival", release_date: "2016-11-10", poster_path: "/a.jpg" }],
      },
    });
    const results = await tmdb.search(ctx(http), "movie", "arrival");

    expect(results).toEqual([
      expect.objectContaining({
        linkProvider: "tmdb:movie",
        externalId: "329865",
        title: "La llegada",
        originalTitle: "Arrival",
        year: "2016",
        posterUrl: "https://image.tmdb.org/t/p/w500/a.jpg",
      }),
    ]);
    expect(calls[0].url).toContain("api_key=v3key");
    expect(calls[0].url).toContain("language=es-ES");
    expect(calls[0].url).toContain("query=arrival");
  });

  it("sends a Read Access Token as a Bearer header instead", async () => {
    const { http, calls } = fakeHttp({ "https://api.themoviedb.org/3/search/tv": { results: [] } });
    await tmdb.search(ctx(http, "eyJhbGciOi"), "series", "x");
    expect(calls[0].headers).toEqual({ Authorization: "Bearer eyJhbGciOi" });
    expect(calls[0].url).not.toContain("api_key");
  });

  it("maps movie details, including the IMDb cross-reference", async () => {
    const { http } = fakeHttp({
      "https://api.themoviedb.org/3/movie/329865": {
        id: 329865,
        title: "La llegada",
        original_title: "Arrival",
        release_date: "2016-11-10",
        runtime: 116,
        overview: "Una lingüista…",
        original_language: "en",
        genres: [{ name: "Ciencia ficción" }, { name: "Drama" }],
        poster_path: "/a.jpg",
        external_ids: { imdb_id: "tt2543164" },
        credits: {
          cast: [{ name: "Amy Adams" }, { name: "Jeremy Renner" }],
          crew: [
            { name: "Denis Villeneuve", job: "Director", department: "Directing" },
            { name: "Eric Heisserer", job: "Screenplay", department: "Writing" },
          ],
        },
      },
    });
    const record = await tmdb.details(ctx(http), "movie", { externalId: "329865" } as never);

    expect(record.values).toEqual({
      title: "La llegada",
      original_title: "Arrival",
      fields: {
        release_date: "2016-11-10",
        director: ["Denis Villeneuve"],
        runtime: 116,
        genres: ["Ciencia ficción", "Drama"],
        synopsis: "Una lingüista…",
        cast: ["Amy Adams", "Jeremy Renner"],
        writers: ["Eric Heisserer"],
        original_language: "inglés",
      },
    });
    expect(record.links).toEqual([
      { provider: "tmdb:movie", external_id: "329865" },
      { provider: "imdb", external_id: "tt2543164" },
    ]);
  });

  it("maps series with their seasons, leaving out specials", async () => {
    const { http } = fakeHttp({
      "https://api.themoviedb.org/3/tv/95396": {
        id: 95396,
        name: "Separación",
        original_name: "Severance",
        first_air_date: "2022-02-18",
        status: "Returning Series",
        created_by: [{ name: "Dan Erickson" }],
        networks: [{ name: "Apple TV+" }],
        external_ids: { imdb_id: "tt11280740" },
        seasons: [
          { season_number: 0, name: "Especiales", episode_count: 2 },
          { season_number: 1, name: "Temporada 1", episode_count: 9, air_date: "2022-02-18", poster_path: "/s1.jpg" },
          { season_number: 2, name: "Temporada 2", episode_count: 10, air_date: "2025-01-17", poster_path: null },
        ],
      },
    });
    const record = await tmdb.details(ctx(http), "series", { externalId: "95396" } as never);

    expect(record.values.fields).toMatchObject({ creators: ["Dan Erickson"], network: "Apple TV+", show_status: "returning" });
    expect(record.seasons).toEqual([
      { number: 1, title: "Temporada 1", episodeCount: 9, airDate: "2022-02-18", posterUrl: "https://image.tmdb.org/t/p/w500/s1.jpg" },
      { number: 2, title: "Temporada 2", episodeCount: 10, airDate: "2025-01-17", posterUrl: null },
    ]);
    expect(record.links.map((l) => l.provider)).toEqual(["tmdb:tv", "imdb"]);
  });
});

describe("openLibrary", () => {
  it("searches works and fills a book from the work plus the search hit", async () => {
    const { http } = fakeHttp({
      "https://openlibrary.org/search.json": {
        docs: [
          {
            key: "/works/OL893415W",
            title: "Dune",
            author_name: ["Frank Herbert"],
            first_publish_year: 1965,
            cover_i: 11481354,
            number_of_pages_median: 604,
            isbn: ["9780441172719"],
            publisher: ["Ace"],
          },
        ],
      },
      "https://openlibrary.org/works/OL893415W.json": {
        title: "Dune",
        description: { value: "Set on the desert planet Arrakis…" },
        subjects: ["Science fiction", "Arrakis", "Ecology", "Politics", "Religion", "Extra"],
        covers: [11481354],
      },
    });
    const [hit] = await openLibrary.search(ctx(http), "book", "dune");
    expect(hit).toMatchObject({ externalId: "OL893415W", year: "1965", extra: "Frank Herbert" });

    const record = await openLibrary.details(ctx(http), "book", hit);
    expect(record.values.fields).toEqual({
      author: ["Frank Herbert"],
      publication_date: "1965",
      pages: 604,
      publisher: "Ace",
      isbn: "9780441172719",
      genres: ["Science fiction", "Arrakis", "Ecology", "Politics", "Religion"],
      synopsis: "Set on the desert planet Arrakis…",
    });
    expect(record.posterUrl).toBe("https://covers.openlibrary.org/b/id/11481354-L.jpg");
  });
});

describe("aniList", () => {
  it("maps an anime, preferring the English title and cleaning the description", async () => {
    const { http, calls } = fakeHttp({
      "https://graphql.anilist.co": {
        data: {
          Media: {
            id: 16498,
            idMal: 16498,
            title: { romaji: "Shingeki no Kyojin", english: "Attack on Titan", native: "進撃の巨人" },
            startDate: { year: 2013, month: 4, day: 7 },
            coverImage: { extraLarge: "https://s4.anilist.co/x.jpg" },
            studios: { nodes: [{ name: "Wit Studio" }] },
            format: "TV",
            episodes: 25,
            genres: ["Action", "Drama"],
            description: "Humanity lives<br><br>inside <i>walls</i>.",
          },
        },
      },
    });
    const record = await aniList.details(ctx(http), "anime", { externalId: "16498" } as never);

    expect(calls[0].body).toMatchObject({ variables: { id: 16498 } });
    expect(record.values).toEqual({
      title: "Attack on Titan",
      original_title: "進撃の巨人",
      fields: {
        first_air_date: "2013-04-07",
        studios: ["Wit Studio"],
        anime_format: "tv",
        episode_count: 25,
        genres: ["Action", "Drama"],
        synopsis: "Humanity lives\n\ninside walls.",
        original_title_romaji: "Shingeki no Kyojin",
      },
    });
    expect(record.links).toEqual([
      { provider: "anilist", external_id: "16498" },
      { provider: "myanimelist", external_id: "16498" },
    ]);
  });
});

describe("providersFor", () => {
  it("returns the providers linked to a type, or all for custom templates", () => {
    expect(providersFor("movie").map((p) => p.id)).toEqual(["tmdb"]);
    expect(providersFor("book").map((p) => p.id)).toEqual(["openlibrary"]);
    expect(providersFor("00000000-0000-4000-8000-000000000001").length).toBeGreaterThan(1);
  });
});
