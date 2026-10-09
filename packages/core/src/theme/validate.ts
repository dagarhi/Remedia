import { z } from "zod";
import {
  THEME_APPEARANCES,
  THEME_FORMAT_VERSION,
  type ThemeColors,
  type ThemeFile,
  type ThemeShape,
  type ThemeTypography,
} from "./types";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const fontStack = z.array(z.string().min(1)).min(1);
const size = z.number().nonnegative();

// Typed as Record<keyof ...> so adding a token without its schema is a compile error.
const colorSchemas: Record<keyof ThemeColors, z.ZodType> = {
  background: hexColor,
  surface: hexColor,
  surfaceRaised: hexColor,
  border: hexColor,
  borderStrong: hexColor,
  text: hexColor,
  textSecondary: hexColor,
  textDisabled: hexColor,
  accent: hexColor,
  onAccent: hexColor,
  accentText: hexColor,
  danger: hexColor,
  success: hexColor,
};

const typographySchemas: Record<keyof ThemeTypography, z.ZodType> = {
  heading: fontStack,
  body: fontStack,
  labelCase: z.enum(["uppercase", "normal"]),
};

const shapeSchemas: Record<keyof ThemeShape, z.ZodType> = {
  radiusControl: size,
  radiusCard: size,
  radiusCover: size,
  radiusTag: z.union([size, z.literal("full")]),
  borderWidth: size,
  shadowRaised: z.literal("none"),
};

const SECTIONS = {
  colors: colorSchemas,
  typography: typographySchemas,
  shape: shapeSchemas,
} as const;

const requiredMeta = {
  formatVersion: z.int().positive(),
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().trim().min(1),
  appearance: z.enum(THEME_APPEARANCES),
};

const optionalMeta = {
  $schema: z.string(),
  author: z.string(),
};

/** JSON Schema of a theme file, generated from the same schemas the validator uses. */
export function themeFileJsonSchema() {
  const section = (schemas: Record<string, z.ZodType>) => z.object(schemas).partial().strict();
  return z.toJSONSchema(
    z
      .object({
        ...requiredMeta,
        ...Object.fromEntries(Object.entries(optionalMeta).map(([k, s]) => [k, s.optional()])),
        colors: section(colorSchemas).optional(),
        typography: section(typographySchemas).optional(),
        shape: section(shapeSchemas).optional(),
      })
      .strict(),
  );
}

/** A value that was dropped. `path` is like "colors.accent". The UI turns it into a translated message. */
export interface ThemeWarning {
  path: string;
  code: "invalid_value" | "unknown_key";
}

/** Reasons a theme cannot be loaded at all. */
export type ThemeError =
  | "invalid_json"
  | "not_an_object"
  | "invalid_metadata"
  | "unsupported_format_version";

export type ThemeValidationResult =
  | { ok: true; theme: ThemeFile; warnings: ThemeWarning[] }
  | { ok: false; error: ThemeError };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parses the text of a theme file, then validates it. */
export function parseThemeFile(text: string): ThemeValidationResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  return validateThemeFile(json);
}

/**
 * Checks a theme file. Invalid or unknown token values are dropped with a warning,
 * so the merge step can fill them from the built-in theme. Broken metadata rejects the file.
 */
export function validateThemeFile(input: unknown): ThemeValidationResult {
  if (!isPlainObject(input)) return { ok: false, error: "not_an_object" };

  const version = requiredMeta.formatVersion.safeParse(input.formatVersion);
  if (version.success && version.data > THEME_FORMAT_VERSION) {
    return { ok: false, error: "unsupported_format_version" };
  }

  const meta: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(requiredMeta)) {
    const result = schema.safeParse(input[key]);
    if (!result.success) return { ok: false, error: "invalid_metadata" };
    meta[key] = result.data;
  }

  const warnings: ThemeWarning[] = [];
  const theme: Record<string, unknown> = { ...meta };

  for (const [key, schema] of Object.entries(optionalMeta)) {
    if (input[key] === undefined) continue;
    const result = schema.safeParse(input[key]);
    if (result.success) theme[key] = result.data;
    else warnings.push({ path: key, code: "invalid_value" });
  }

  for (const [sectionName, schemas] of Object.entries(SECTIONS)) {
    const section = input[sectionName];
    if (section === undefined) continue;
    if (!isPlainObject(section)) {
      warnings.push({ path: sectionName, code: "invalid_value" });
      continue;
    }
    const valid: Record<string, unknown> = {};
    for (const [token, value] of Object.entries(section)) {
      const schema = (schemas as Record<string, z.ZodType>)[token];
      if (!schema) {
        warnings.push({ path: `${sectionName}.${token}`, code: "unknown_key" });
        continue;
      }
      const result = schema.safeParse(value);
      if (result.success) valid[token] = result.data;
      else warnings.push({ path: `${sectionName}.${token}`, code: "invalid_value" });
    }
    theme[sectionName] = valid;
  }

  const knownKeys = new Set([...Object.keys(requiredMeta), ...Object.keys(optionalMeta), ...Object.keys(SECTIONS)]);
  for (const key of Object.keys(input)) {
    if (!knownKeys.has(key)) warnings.push({ path: key, code: "unknown_key" });
  }

  return { ok: true, theme: theme as unknown as ThemeFile, warnings };
}
