import { queryString, unique, type Provider, type SearchResult } from "./types";

/* Open Library: books. No key needed. */

const API = "https://openlibrary.org";
const COVERS = "https://covers.openlibrary.org/b/id";

type Json = Record<string, any>;

const SEARCH_FIELDS = "key,title,subtitle,author_name,first_publish_year,cover_i,number_of_pages_median,isbn,publisher";

/** "/works/OL45883W" -> "OL45883W" */
const workId = (key: string) => key.split("/").pop() ?? key;

/**
 * Open Library "subjects" mix genres with places, people and notes ("Dune (Imaginary place)",
 * "New York Times reviewed"). Only short, plain ones are kept as genres.
 */
const genreLike = (subject: string) => subject.length <= 25 && !/[(),:]|reviewed|accessible|protected/i.test(subject);

/** Descriptions come as a string or as `{ value }`. */
const text = (value: unknown): string | undefined =>
  typeof value === "string" ? value : typeof value === "object" && value ? (value as Json).value : undefined;

export const openLibrary: Provider = {
  id: "openlibrary",
  templates: ["book"],
  needsCredentials: false,
  isConfigured: () => true,

  async search(ctx, _template, query) {
    const data = (await ctx.http.getJson(
      `${API}/search.json?${queryString({ q: query, limit: "20", fields: SEARCH_FIELDS })}`,
    )) as Json;
    return ((data.docs as Json[]) ?? []).map(
      (d): SearchResult => ({
        provider: "openlibrary",
        linkProvider: "openlibrary",
        externalId: workId(d.key),
        title: d.title,
        originalTitle: null,
        year: d.first_publish_year ? String(d.first_publish_year) : null,
        extra: unique(d.author_name ?? [], 3).join(", ") || null,
        posterUrl: d.cover_i ? `${COVERS}/${d.cover_i}-L.jpg` : null,
        hints: d,
      }),
    );
  },

  async details(ctx, _template, result) {
    // The work has the description and subjects; authors, pages and ISBN come from the search hit.
    const work = (await ctx.http.getJson(`${API}/works/${result.externalId}.json`)) as Json;
    const hit = (result.hints ?? {}) as Json;
    return {
      values: {
        title: work.title ?? result.title,
        fields: {
          author: unique(hit.author_name ?? []),
          publication_date: hit.first_publish_year ? String(hit.first_publish_year) : undefined,
          pages: hit.number_of_pages_median || undefined,
          publisher: unique(hit.publisher ?? [], 1)[0],
          isbn: unique(hit.isbn ?? [], 1)[0],
          genres: unique((work.subjects ?? []).filter(genreLike), 5),
          synopsis: text(work.description),
        },
      },
      links: [{ provider: "openlibrary", external_id: result.externalId }],
      posterUrl: work.covers?.[0] ? `${COVERS}/${work.covers[0]}-L.jpg` : result.posterUrl,
    };
  },
};
