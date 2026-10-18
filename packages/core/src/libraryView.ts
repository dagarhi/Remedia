import type { MediaRecord } from "./record";
import { normalizeText } from "./text";

/*
 * The library view ("See all", UI Design): search, type filter, sort and grouping over the
 * records of one status. Plain functions, so mobile can reuse them.
 */

export const LIBRARY_SORTS = ["modified", "title", "release", "rating", "added"] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

export interface LibraryQuery {
  /** Matches the title or the original title, ignoring case and accents. */
  search?: string;
  /** Template ids to keep; empty or absent = all types. */
  templates?: string[];
  sort: LibrarySort;
}

/** Date fields that hold each type's release, in order of preference (built-in templates). */
const RELEASE_FIELDS = ["release_date", "first_air_date", "publication_date", "air_date"];

/** The record's release date as stored (partial ISO: "2016", "2016-11", "2016-11-11"), if any. */
export function releaseDate(record: MediaRecord): string | null {
  for (const key of RELEASE_FIELDS) {
    const value = record.fields[key];
    if (typeof value === "string") return value;
  }
  return null;
}

/** Sorts nulls last, whatever the direction. */
function compareNullable<T>(a: T | null, b: T | null, compare: (x: T, y: T) => number): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return compare(a, b);
}

const byTitle = (a: MediaRecord, b: MediaRecord) => normalizeText(a.title).localeCompare(normalizeText(b.title));

const SORTS: Record<LibrarySort, (a: MediaRecord, b: MediaRecord) => number> = {
  // Newest first for times and dates, best first for ratings, A-Z for titles.
  modified: (a, b) => b.updated_at - a.updated_at,
  added: (a, b) => b.created_at - a.created_at,
  title: byTitle,
  // Partial ISO dates sort correctly as text, even with mixed precision (data model).
  release: (a, b) => compareNullable(releaseDate(a), releaseDate(b), (x, y) => y.localeCompare(x)) || byTitle(a, b),
  rating: (a, b) => compareNullable(a.rating, b.rating, (x, y) => y - x) || byTitle(a, b),
};

/** Filters and sorts records for the library view. Never changes the input array. */
export function queryLibrary(records: MediaRecord[], query: LibraryQuery): MediaRecord[] {
  const search = normalizeText(query.search ?? "");
  const types = new Set(query.templates ?? []);
  return records
    .filter((r) => types.size === 0 || types.has(r.template))
    .filter(
      (r) =>
        search === "" ||
        normalizeText(r.title).includes(search) ||
        (r.original_title !== null && normalizeText(r.original_title).includes(search)),
    )
    .sort(SORTS[query.sort]);
}

export interface RecordGroup {
  template: string;
  records: MediaRecord[];
}

/** Groups records by type in the given order, keeping each group's order; empty groups are left out. */
export function groupByTemplate(records: MediaRecord[], order: string[]): RecordGroup[] {
  const rank = (template: string) => (order.includes(template) ? order.indexOf(template) : order.length);
  const groups = new Map<string, MediaRecord[]>();
  for (const record of records) groups.set(record.template, [...(groups.get(record.template) ?? []), record]);
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([template, list]) => ({ template, records: list }));
}
