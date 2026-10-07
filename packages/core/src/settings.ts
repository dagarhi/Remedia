import type { Timestamp } from "./common";

/** One row of `settings`. Rows are never deleted; resetting stores the default. */
export interface Setting {
  /** Stable key defined in code, e.g. "rating_display.movie". */
  key: string;
  /** Any JSON value; its shape depends on the key. */
  value: unknown;
  updated_at: Timestamp;
}
