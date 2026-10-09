import type { EffectiveField, EffectiveTemplate } from "./effectiveTemplate";
import type { FieldValue, RecordFields } from "./record";

/** ISO date at the known precision: "2016", "2016-11" or "2016-11-11". */
const PARTIAL_DATE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;

/** http(s) links only. A regex because `URL` is a browser/Node API, not plain JavaScript. */
const WEB_URL = /^https?:\/\/[^\s/$.?#][^\s]*$/i;

export interface FieldError {
  key: string;
  code: "required" | "wrong_type" | "empty" | "invalid_date" | "invalid_url" | "unknown_option";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function checkValue(field: EffectiveField, value: unknown): FieldError["code"] | null {
  switch (field.type) {
    case "text":
    case "long_text":
      if (typeof value !== "string") return "wrong_type";
      return value.trim() === "" ? "empty" : null;
    case "url":
      if (typeof value !== "string") return "wrong_type";
      return WEB_URL.test(value) ? null : "invalid_url";
    case "text_list":
      if (!Array.isArray(value)) return "wrong_type";
      return value.length > 0 && value.every(isNonEmptyString) ? null : "empty";
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? null : "wrong_type";
    case "date":
      if (typeof value !== "string") return "wrong_type";
      return PARTIAL_DATE.test(value) ? null : "invalid_date";
    case "select":
      if (typeof value !== "string") return "wrong_type";
      return field.options?.some((o) => o.key === value) ? null : "unknown_option";
    case "boolean":
      return typeof value === "boolean" ? null : "wrong_type";
  }
}

/**
 * Checks `fields` against the record's template before saving. Keys the template does not
 * know (from a newer app version) are kept and not checked. Hidden fields keep their data,
 * so they are type-checked but never required.
 */
export function validateFields(fields: Record<string, unknown>, template: EffectiveTemplate): FieldError[] {
  const errors: FieldError[] = [];
  for (const field of template.fields) {
    const value = fields[field.key];
    if (value === undefined) {
      if (field.required && !field.hidden) errors.push({ key: field.key, code: "required" });
      continue;
    }
    const code = checkValue(field, value);
    if (code) errors.push({ key: field.key, code });
  }
  return errors;
}

/**
 * Prepares form values for storage: trims text and drops empty values, because an empty
 * field is never stored (no "", null or []). `false` and `0` are values and are kept.
 */
export function compactFields(values: Record<string, FieldValue | null | undefined>): RecordFields {
  const result: RecordFields = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed !== "") result[key] = trimmed;
    } else if (Array.isArray(value)) {
      const items = value.map((v) => v.trim()).filter((v) => v !== "");
      if (items.length > 0) result[key] = items;
    } else {
      result[key] = value;
    }
  }
  return result;
}
