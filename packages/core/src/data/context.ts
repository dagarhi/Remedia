import type { Timestamp, Uuid } from "../common";
import type { Database } from "../db/client";

/**
 * What the data functions need from the platform. Generating UUIDs is not plain
 * JavaScript (it is a browser/Node API), so each app passes its own; tests pass
 * predictable ones.
 */
export interface DataContext {
  db: Database;
  /** Lowercase UUID v4. */
  newId: () => Uuid;
  /** Current time in ms UTC. */
  now: () => Timestamp;
}

/** One problem found before saving. `path` is "title", "rating", "fields.runtime"... The UI translates `code`. */
export interface DataIssue {
  path: string;
  code: string;
}

/** Thrown when data would break a rule; nothing has been written. */
export class DataValidationError extends Error {
  constructor(public readonly issues: DataIssue[]) {
    super(`Invalid data: ${issues.map((i) => `${i.path} (${i.code})`).join(", ")}`);
    this.name = "DataValidationError";
  }
}
