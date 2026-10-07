import type { SyncTimestamps, Uuid } from "./common";

export const RECORD_STATUSES = [
  "planned",
  "in_progress",
  "paused",
  "completed",
  "dropped",
] as const;

export type RecordStatus = (typeof RECORD_STATUSES)[number];
export type FieldValue = string | number | boolean | string[];

/** Type-specific values keyed by field key. Empty fields are absent, never null. */
export type RecordFields = Record<string, FieldValue>;

/** One row of the `records` table. */
export interface MediaRecord extends SyncTimestamps {
  id: Uuid;
  /** Template id: readable for built-ins ("movie"), UUID for custom templates. */
  template: string;
  /** Only seasons have a parent (their series). */
  parent_id: Uuid | null;
  title: string;
  original_title: string | null;
  status: RecordStatus;
  rating: number | null;
  notes: string | null;
  fields: RecordFields;
}

/** One row of `history_entries`: a free-text diary entry, ordered by `created_at`. */
export interface HistoryEntry extends SyncTimestamps {
  id: Uuid;
  record_id: Uuid;
  /** Never empty. */
  text: string;
}

export const IMAGE_KINDS = ["cover", "gallery"] as const;

export type ImageKind = (typeof IMAGE_KINDS)[number];

/** One row of `record_images`. At most one live cover per record. */
export interface RecordImage extends SyncTimestamps {
  id: Uuid;
  record_id: Uuid;
  kind: ImageKind;
  /** Relative to the images folder, never absolute. */
  path: string;
  caption: string | null;
  position: number;
}

/** One row of `external_links`. */
export interface ExternalLink extends SyncTimestamps {
  id: Uuid;
  record_id: Uuid;
  /** Includes its scope when the provider has separate id spaces: "tmdb:movie", "tmdb:tv", "imdb". */
  provider: string;
  /** Always text: some ids contain letters ("tt1375666"). */
  external_id: string;
}
