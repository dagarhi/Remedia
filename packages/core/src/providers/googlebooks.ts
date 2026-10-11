import {
  credential,
  isoDate,
  languageName,
  queryString,
  stripHtml,
  unique,
  yearOf,
  type Provider,
  type SearchResult,
} from "./types";

/* Google Books: books, often with better Spanish editions. Needs a free API key. */

const API = "https://www.googleapis.com/books/v1/volumes";

type Json = Record<string, any>;

/** Google returns http thumbnails with a page-curl effect; https and no curl look better. */
function cover(links: Json | undefined): string | null {
  const url: string | undefined = links?.thumbnail ?? links?.smallThumbnail;
  return url ? url.replace(/^http:/, "https:").replace("&edge=curl", "") : null;
}

const isbn13 = (info: Json) =>
  (info.industryIdentifiers ?? []).find((i: Json) => i.type === "ISBN_13")?.identifier as string | undefined;

export const googleBooks: Provider = {
  id: "googlebooks",
  templates: ["book"],
  credentials: { section: "google_books", fields: ["key"] },

  async search(ctx, _template, query) {
    const key = credential(ctx.credentials, "google_books", "key");
    const data = (await ctx.http.getJson(
      `${API}?${queryString({ q: query, maxResults: "20", printType: "books", key })}`,
    )) as Json;
    return ((data.items as Json[]) ?? []).map((item): SearchResult => {
      const info = item.volumeInfo ?? {};
      return {
        provider: "googlebooks",
        linkProvider: "googlebooks",
        externalId: item.id,
        title: info.subtitle ? `${info.title}: ${info.subtitle}` : info.title,
        originalTitle: null,
        year: yearOf(info.publishedDate),
        extra: unique([unique(info.authors ?? [], 3).join(", "), info.publisher]).join(" · ") || null,
        posterUrl: cover(info.imageLinks),
        hints: info,
      };
    });
  },

  // The search hit already has the volume details, so no second request (saves quota).
  async details(ctx, _template, result) {
    const info = (result.hints ?? {}) as Json;
    const isbn = isbn13(info);
    return {
      values: {
        title: result.title,
        fields: {
          author: unique(info.authors ?? []),
          publication_date: isoDate(info.publishedDate),
          pages: info.pageCount || undefined,
          publisher: info.publisher ?? undefined,
          isbn,
          genres: unique(info.categories ?? [], 5),
          synopsis: stripHtml(info.description),
          original_language: languageName(info.language, ctx.language),
        },
      },
      // The ISBN links the same edition found in Open Library (data model, duplicates).
      links: [
        { provider: "googlebooks", external_id: result.externalId },
        ...(isbn ? [{ provider: "isbn", external_id: isbn }] : []),
      ],
      posterUrl: result.posterUrl,
    };
  },
};
