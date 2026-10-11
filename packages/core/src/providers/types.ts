import type { NewRecord } from "../data/records";
import type { Language } from "../settings";

/*
 * External services (CLAUDE.md, Providers): each provider is an adapter that maps its API
 * responses to the common record format. HTTP is done by the platform (passed in), so the
 * mapping stays plain TypeScript and is tested with saved sample responses.
 */

export const PROVIDER_IDS = ["tmdb", "tvmaze", "openlibrary", "googlebooks", "rawg", "igdb", "anilist", "jikan"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

/** Minimal HTTP the adapters need; desktop implements it with the Tauri HTTP plugin. */
export interface HttpClient {
  getJson(url: string, headers?: Record<string, string>): Promise<unknown>;
  postJson(url: string, body: unknown, headers?: Record<string, string>): Promise<unknown>;
  postText(url: string, body: string, headers?: Record<string, string>): Promise<unknown>;
}

/** Personal keys from credentials.toml: `{ section: { field: value } }`. Missing = not configured. */
export type ProviderCredentials = Record<string, Record<string, string> | undefined>;

/** One field of a provider section, trimmed; "" when missing. */
export function credential(credentials: ProviderCredentials, section: string, field: string): string {
  return credentials[section]?.[field]?.trim() ?? "";
}

export interface ProviderContext {
  http: HttpClient;
  /** Metadata language (titles, synopses) follows the app language. */
  language: Language;
  credentials: ProviderCredentials;
}

/** One search hit, enough to show a result row and to fetch the details. */
export interface SearchResult {
  provider: ProviderId;
  /** The external link provider with its scope, e.g. "tmdb:movie", "openlibrary". */
  linkProvider: string;
  externalId: string;
  title: string;
  originalTitle: string | null;
  year: string | null;
  /** Short extra line: author, studio, platforms… */
  extra: string | null;
  posterUrl: string | null;
  /** Adapter-private data from the search response, reused by `details`. */
  hints?: unknown;
}

export interface ExternalLinkInput {
  provider: string;
  external_id: string;
}

export interface SeasonInput {
  number: number;
  title: string;
  episodeCount: number | null;
  airDate: string | null;
  posterUrl: string | null;
}

/** Everything needed to pre-fill the form (UI Design, add flow). */
export interface ProviderRecord {
  values: Omit<NewRecord, "template" | "cover" | "tags" | "parent_id">;
  /** Every id the provider returns, cross-references included, to catch duplicates (data model). */
  links: ExternalLinkInput[];
  posterUrl: string | null;
  /** Series only: seasons to create as child records. */
  seasons?: SeasonInput[];
}

export interface Provider {
  id: ProviderId;
  /** Templates it can fill. */
  templates: string[];
  /** Its section and fields in credentials.toml; null when it needs no key. */
  credentials: { section: string; fields: string[] } | null;
  search(ctx: ProviderContext, template: string, query: string): Promise<SearchResult[]>;
  details(ctx: ProviderContext, template: string, result: SearchResult): Promise<ProviderRecord>;
}

/** True when the provider needs no key, or every field of its key is filled in. */
export function isConfigured(provider: Provider, credentials: ProviderCredentials): boolean {
  const spec = provider.credentials;
  return !spec || spec.fields.every((field) => credential(credentials, spec.section, field) !== "");
}

/** Year from a date string ("2016-11-11" -> "2016"), if any. */
export function yearOf(date: string | null | undefined): string | null {
  return date && /^\d{4}/.test(date) ? date.slice(0, 4) : null;
}

/** A provider date as a partial ISO date the data model accepts, or undefined. */
export function isoDate(date: string | null | undefined): string | undefined {
  if (!date) return undefined;
  const match = /^(\d{4})(-\d{2})?(-\d{2})?/.exec(date);
  return match ? match[0] : undefined;
}

/** "en" -> "English" / "inglés", in the app language; unknown codes are kept as they are. */
export function languageName(code: string | null | undefined, language: Language): string | undefined {
  if (!code) return undefined;
  try {
    return new Intl.DisplayNames([language], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Removes duplicates and empty values, keeping order. */
export function unique(values: (string | null | undefined)[], limit = Infinity): string[] {
  return [...new Set(values.filter((v): v is string => !!v && v.trim() !== ""))].slice(0, limit);
}

/** "a=1&b=x%20y". `URLSearchParams` is a browser/Node API, so core builds query strings itself. */
export function queryString(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

/** Plain text from provider HTML ("<p>A<br>B</p>" -> "A\nB"); undefined when empty. */
export function stripHtml(html: string | null | undefined): string | undefined {
  if (!html) return undefined;
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || undefined;
}
