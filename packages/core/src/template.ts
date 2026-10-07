import type { SyncTimestamps } from "./common";

/** Built-in templates, defined in code. `season` is internal: only used as a child of `series`. */
export const BUILT_IN_TEMPLATE_IDS = ["movie", "series", "book", "game", "season"] as const;

export type BuiltInTemplateId = (typeof BUILT_IN_TEMPLATE_IDS)[number];

/** Field types available to every template. */
export const FIELD_TYPES = [
  "text",
  "long_text",
  "text_list",
  "number",
  "date",
  "select",
  "boolean",
  "url",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

/** One row of `templates`. */
export interface Template extends SyncTimestamps {
  /** Readable id for built-ins ("movie"), UUID v4 for custom templates. */
  id: string;
  /** Null for built-ins (the name comes from i18n); required for custom templates. */
  name: string | null;
  /**
   * The user's part only: changes for a built-in, the full definition for a custom template.
   * Its structure is still an open question in the data model, so it stays `unknown` for now.
   */
  definition: unknown;
}
