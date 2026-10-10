import type { Timestamp } from "./common";
import { RATING_SCALES, type RatingScale } from "./rating";

/** One row of `settings`. Rows are never deleted; resetting stores the default. */
export interface Setting {
  /** Stable key defined in code, e.g. "rating_display.movie". */
  key: string;
  /** Any JSON value; its shape depends on the key. */
  value: unknown;
  updated_at: Timestamp;
}

export const LANGUAGES = ["en", "es"] as const;
export type Language = (typeof LANGUAGES)[number];

export const THEME_MODES = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** Every setting the app knows, with its type. Keys are stable: never rename one. */
export interface Settings {
  /** "system" follows the operating system language. */
  language: Language | "system";
  "theme.mode": ThemeMode;
  /** Rating display scale used by every type without its own. */
  "rating_display.default": RatingScale;
  /** Per-type override, e.g. "rating_display.movie"; "default" or absent = use the global default. */
  [perType: `rating_display.${string}`]: RatingScale | "default" | undefined;
}

export const SETTING_DEFAULTS: Settings = {
  language: "system",
  "theme.mode": "system",
  "rating_display.default": "stars_5",
};

const isOneOf =
  <T extends string>(values: readonly T[]) =>
  (value: unknown): value is T =>
    typeof value === "string" && (values as readonly string[]).includes(value);

/** Checks a stored value, so a broken or older value falls back to the default instead of breaking the app. */
export function isValidSettingValue(key: string, value: unknown): boolean {
  if (key === "language") return value === "system" || isOneOf(LANGUAGES)(value);
  if (key === "theme.mode") return isOneOf(THEME_MODES)(value);
  if (key === "rating_display.default") return isOneOf(RATING_SCALES)(value);
  if (key.startsWith("rating_display.")) return value === "default" || isOneOf(RATING_SCALES)(value);
  return false;
}

/** The rating scale to show for a record type: its own setting, or the global default. */
export function ratingScaleFor(settings: Settings, templateId: string): RatingScale {
  const own = settings[`rating_display.${templateId}`];
  return own === undefined || own === "default" ? settings["rating_display.default"] : own;
}
