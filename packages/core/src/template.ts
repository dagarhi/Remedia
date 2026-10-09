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

/** An option of a `select` field. Records store the key, never the label. */
export interface SelectOption {
  key: string;
  /** i18n key for built-in options, plain text for user-added ones. */
  label: string;
}

export interface FieldDefinition {
  /** Readable for built-in fields ("runtime"), UUID v4 for user-added ones. */
  key: string;
  type: FieldType;
  /** i18n key for built-in fields, plain text for user-added ones. */
  label: string;
  required: boolean;
  /** `number` fields only, e.g. "min". */
  unit?: string;
  /** `select` fields only. */
  options?: SelectOption[];
  /** User-added fields only; built-in fields are hidden through `FieldOverride`. */
  hidden?: boolean;
}

/** Which `number` field is the progress and, optionally, which one is its total. */
export interface ProgressDefinition {
  field: string;
  total: string | null;
}

/** Built-in template definition. Lives only in code, never in the database. */
export interface CodeTemplateDefinition {
  fields: FieldDefinition[];
  /** Field keys; `title` is always an identity field and is not listed. */
  identity: string[];
  progress: ProgressDefinition | null;
}

/** User changes to one built-in field: only the properties the user touched. */
export interface FieldOverride {
  label?: string;
  hidden?: boolean;
  /** New options for a built-in `select`; built-in options cannot be removed. */
  added_options?: SelectOption[];
}

/**
 * Stored in `templates.definition`: changes for a built-in, the full definition for a custom template.
 * Every key is optional and absent when unused.
 */
export interface UserTemplateDefinition {
  /** Built-in templates only, keyed by built-in field key. */
  overrides?: Record<string, FieldOverride>;
  added?: FieldDefinition[];
  /** Custom templates only. */
  identity?: string[];
  /** Custom templates only. */
  progress?: ProgressDefinition | null;
  /** Field keys in display order. When absent: built-in fields, then added fields. */
  order?: string[];
}

/** One row of `templates`. */
export interface Template extends SyncTimestamps {
  /** Readable id for built-ins ("movie"), UUID v4 for custom templates. */
  id: string;
  /** Null for built-ins (the name comes from i18n); required for custom templates. */
  name: string | null;
  definition: UserTemplateDefinition;
}
