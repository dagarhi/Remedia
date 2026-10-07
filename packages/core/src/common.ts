export type Uuid = string;

/** Milliseconds since the Unix epoch, always UTC (`Date.now()`). */
export type Timestamp = number;

/** Timestamps every synced row carries (all tables except `settings`). */
export interface SyncTimestamps {
  created_at: Timestamp;
  updated_at: Timestamp;
  /** Soft delete: set instead of removing the row. */
  deleted_at: Timestamp | null;
}
