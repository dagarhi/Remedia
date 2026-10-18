import { describe, expect, it } from "vitest";
import { googleBooks } from "./googlebooks";
import { igdb, resetIgdbToken } from "./igdb";
import { jikan } from "./jikan";
import { rawg } from "./rawg";
import { tvmaze } from "./tvmaze";
import { isConfigured, type HttpClient, type ProviderContext, type ProviderCredentials } from "./types";

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

const ctx = (http: HttpClient, credentials: ProviderCredentials = {}): ProviderContext => ({
  http,
  language: "es",
  credentials,
});

describe("tvmaze", () => {
  it("maps a series with creators, the IMDb link and its seasons", async () => {
    const { http, calls } = fakeHttp({
      "https://api.tvmaze.com/shows/44933": {
        id: 44933,
        name: "Severance",
        premiered: "2022-02-18",
        status: "Running",
        language: "English",
        network: null,
        webChannel: { name: "Apple TV" },
        genres: ["Drama", "Mystery"],
        summary: "<p><b>Severance</b> follows Mark.</p>",
        image: { original: "https://static.tvmaze.com/s.jpg" },
        externals: { imdb: "tt11280740" },
        _embedded: {
          crew: [
            { type: "Creator", person: { name: "Dan Erickson" } },
            { type: "Producer", person: { name: "Someone" } },
          ],
          cast: [{ person: { name: "Adam Scott" } }],
          seasons: [
            { number: 1, name: "", episodeOrder: 9, premiereDate: "2022-02-18", image: null },
            { number: 3, name: "", episodeOrder: null, premiereDate: null, image: null },
          ],
        },
      },
    });
    const record = await tvmaze.details(ctx(http), "series", { externalId: "44933" } as never);

    expect(calls[0].url).toContain("embed%5B%5D=seasons");
    expect(record.values.fields).toMatchObject({
      creators: ["Dan Erickson"],
      network: "Apple TV",
      show_status: "returning",
      synopsis: "Severance follows Mark.",
    });
    expect(record.links).toEqual([
      { provider: "tvmaze", external_id: "44933" },
      { provider: "imdb", external_id: "tt11280740" },
    ]);
    expect(record.seasons?.map((s) => [s.number, s.episodeCount])).toEqual([
      [1, 9],
      [3, null],
    ]);
  });
});

describe("jikan", () => {
  it("fills an anime from the search hit alone, with the MyAnimeList link AniList also uses", async () => {
    const { http, calls } = fakeHttp({
      "https://api.jikan.moe/v4/anime": {
        data: [
          {
            mal_id: 52991,
            title: "Sousou no Frieren",
            title_english: "Frieren: Beyond Journey's End",
            title_japanese: "葬送のフリーレン",
            images: { jpg: { image_url: "https://cdn.myanimelist.net/s.jpg", large_image_url: "https://cdn.myanimelist.net/l.jpg" } },
            aired: { from: "2023-09-29T00:00:00+00:00" },
            episodes: 28,
            type: "TV",
            studios: [{ name: "Madhouse" }],
            genres: [{ name: "Adventure" }],
            synopsis: "An elf mage.\n\n[Written by MAL Rewrite]",
          },
        ],
      },
    });
    const [hit] = await jikan.search(ctx(http), "anime", "frieren");
    const record = await jikan.details(ctx(http), "anime", hit);

    expect(calls).toHaveLength(1);
    expect(record.values).toMatchObject({
      title: "Frieren: Beyond Journey's End",
      original_title: "葬送のフリーレン",
      fields: {
        first_air_date: "2023-09-29",
        episode_count: 28,
        anime_format: "tv",
        synopsis: "An elf mage.",
        original_title_romaji: "Sousou no Frieren",
      },
    });
    expect(record.links).toEqual([{ provider: "myanimelist", external_id: "52991" }]);
    expect(record.posterUrl).toBe("https://cdn.myanimelist.net/l.jpg");
  });

  it("fills a manga, skipping light novels and turning MAL names around", async () => {
    const { http, calls } = fakeHttp({
      "https://api.jikan.moe/v4/manga": {
        data: [
          { mal_id: 1, title: "Some Light Novel", type: "Light Novel" },
          {
            mal_id: 13,
            title: "One Piece",
            title_english: "One Piece",
            title_japanese: "ONE PIECE",
            type: "Manga",
            status: "Publishing",
            chapters: null,
            volumes: null,
            published: { from: "1997-07-22T00:00:00+00:00" },
            authors: [{ name: "Oda, Eiichiro" }],
            genres: [{ name: "Adventure" }],
            synopsis: "Pirates. [Written by MAL Rewrite]",
          },
        ],
      },
    });
    const hits = await jikan.search(ctx(http), "manga", "one piece");
    const record = await jikan.details(ctx(http), "manga", hits[0]);

    expect(calls[0].url).toMatch(/^https:\/\/api\.jikan\.moe\/v4\/manga\?/);
    expect(hits.map((h) => h.title)).toEqual(["One Piece"]);
    expect(hits[0].linkProvider).toBe("myanimelist:manga");
    expect(record.values.fields).toEqual({
      publication_date: "1997-07-22",
      author: ["Eiichiro Oda"],
      manga_format: "manga",
      publishing_status: "manga_publishing",
      genres: ["Adventure"],
      synopsis: "Pirates.",
    });
    expect(record.links).toEqual([{ provider: "myanimelist:manga", external_id: "13" }]);
  });
});

describe("googleBooks", () => {
  it("sends the key, uses https covers and links the ISBN", async () => {
    const { http, calls } = fakeHttp({
      "https://www.googleapis.com/books/v1/volumes": {
        items: [
          {
            id: "abc123",
            volumeInfo: {
              title: "La sombra del viento",
              authors: ["Carlos Ruiz Zafón"],
              publisher: "Planeta",
              publishedDate: "2001-04",
              description: "<p>Barcelona, 1945.</p>",
              pageCount: 576,
              categories: ["Fiction"],
              language: "es",
              imageLinks: {
                thumbnail: "http://books.google.com/books/content?id=abc123&printsec=frontcover&img=1&zoom=1&edge=curl",
              },
              industryIdentifiers: [
                { type: "ISBN_10", identifier: "8408043641" },
                { type: "ISBN_13", identifier: "9788408043645" },
              ],
            },
          },
        ],
      },
    });
    const c = ctx(http, { google_books: { key: "gkey" } });
    const [hit] = await googleBooks.search(c, "book", "sombra del viento");
    const record = await googleBooks.details(c, "book", hit);

    expect(calls[0].url).toContain("key=gkey");
    expect(hit.posterUrl).toBe("https://books.google.com/books/content?id=abc123&printsec=frontcover&img=1&zoom=1");
    expect(record.values.fields).toMatchObject({
      author: ["Carlos Ruiz Zafón"],
      publication_date: "2001-04",
      pages: 576,
      isbn: "9788408043645",
      synopsis: "Barcelona, 1945.",
      original_language: "español",
    });
    expect(record.links).toEqual([
      { provider: "googlebooks", external_id: "abc123" },
      { provider: "isbn", external_id: "9788408043645" },
    ]);
  });
});

describe("rawg", () => {
  it("maps a game with developers, publishers and platforms", async () => {
    const { http, calls } = fakeHttp({
      "https://api.rawg.io/api/games/3498": {
        id: 3498,
        name: "Grand Theft Auto V",
        released: "2013-09-17",
        description_raw: "Los Santos.",
        background_image: "https://media.rawg.io/g.jpg",
        developers: [{ name: "Rockstar North" }],
        publishers: [{ name: "Rockstar Games" }],
        platforms: [{ platform: { name: "PC" } }, { platform: { name: "PlayStation 5" } }],
        genres: [{ name: "Action" }],
      },
    });
    const record = await rawg.details(ctx(http, { rawg: { key: "rkey" } }), "game", { externalId: "3498" } as never);

    expect(calls[0].url).toContain("key=rkey");
    expect(record.values.fields).toEqual({
      release_date: "2013-09-17",
      developers: ["Rockstar North"],
      publishers: ["Rockstar Games"],
      platforms: ["PC", "PlayStation 5"],
      genres: ["Action"],
      synopsis: "Los Santos.",
    });
  });
});

describe("igdb", () => {
  it("gets a Twitch token once, then searches with it, escaping quotes", async () => {
    resetIgdbToken();
    const { http, calls } = fakeHttp({
      "https://id.twitch.tv/oauth2/token": { access_token: "tok", expires_in: 3600 },
      "https://api.igdb.com/v4/games": [
        {
          id: 1942,
          name: "The Witcher 3: Wild Hunt",
          first_release_date: 1431993600,
          summary: "Geralt.",
          cover: { image_id: "co1wyy" },
          platforms: [{ name: "PC" }],
          genres: [{ name: "RPG" }],
          involved_companies: [
            { developer: true, publisher: false, company: { name: "CD Projekt RED" } },
            { developer: false, publisher: true, company: { name: "Bandai Namco" } },
          ],
        },
      ],
    });
    const c = ctx(http, { igdb: { client_id: "cid", client_secret: "sec" } });
    const [hit] = await igdb.search(c, "game", 'witcher "3"');
    await igdb.search(c, "game", "witcher");
    const record = await igdb.details(c, "game", hit);

    expect(calls.filter((x) => x.url.startsWith("https://id.twitch.tv"))).toHaveLength(1);
    expect(calls[1].headers).toMatchObject({ "Client-ID": "cid", Authorization: "Bearer tok" });
    expect(calls[1].body).toContain('search "witcher \\"3\\"";');
    expect(hit.posterUrl).toBe("https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg");
    expect(record.values.fields).toMatchObject({
      release_date: "2015-05-19",
      developers: ["CD Projekt RED"],
      publishers: ["Bandai Namco"],
    });
  });
});

describe("isConfigured", () => {
  it("is true without a key requirement, and when every field is filled", () => {
    expect(isConfigured(tvmaze, {})).toBe(true);
    expect(isConfigured(igdb, { igdb: { client_id: "a", client_secret: "" } })).toBe(false);
    expect(isConfigured(igdb, { igdb: { client_id: "a", client_secret: "b" } })).toBe(true);
  });
});
