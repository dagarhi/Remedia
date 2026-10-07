import type { SyncTimestamps, Uuid } from "./common";

/** One row of `tags`. Tags are global: any record of any type can use them. */
export interface Tag extends SyncTimestamps {
  id: Uuid;
  /** As the user typed it. */
  name: string;
  /** Lowercase, trimmed, accents removed; computed by `core`. Unique among live tags. */
  normalized_name: string;
}

/** One row of `record_tags`. Composite key (`record_id`, `tag_id`); re-adding clears `deleted_at`. */
export interface RecordTag extends SyncTimestamps {
  record_id: Uuid;
  tag_id: Uuid;
}
