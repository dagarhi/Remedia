import type { Timestamp } from "./common";
import { RATING_SCALES, type RatingScale } from "./rating";
import { RECORD_STATUSES, type RecordStatus } from "./record";

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

/** Home blocks the app knows (UI Design). The UI keeps the matching components. */
export const HOME_BLOCKS = ["libraries", "random-pick", "recent-activity"] as const;
export type HomeBlock = (typeof HOME_BLOCKS)[number];

export const PROFILE_NAME_MAX_LENGTH = 40;

/** How a type is added: ask each time, always search a provider, or always the empty form. */
export const ADD_MODES = ["ask", "automatic", "manual"] as const;
export type AddMode = (typeof ADD_MODES)[number];

/** Every setting the app knows, with its type. Keys are stable: never rename one. */
export interface Settings {
  /** "system" follows the operating system language. */
  language: Language | "system";
  "theme.mode": ThemeMode;
  /** Shown in the Home greeting; empty until the user enters it. */
  "profile.name": string;
  /** Active Home blocks, in display order. */
  "home.blocks": HomeBlock[];
  /** Libraries shown by the "Your libraries" block, in display order. */
  "home.libraries": RecordStatus[];
  /** Rating display scale used by every type without its own. */
  "rating_display.default": RatingScale;
  /** Per-type override, e.g. "rating_display.movie"; "default" or absent = use the global default. */
  [perType: `rating_display.${string}`]: RatingScale | "default" | undefined;
  /** Per-type add mode, e.g. "add_mode.movie"; absent = "ask". */
  [addMode: `add_mode.${string}`]: AddMode | undefined;
}

export const SETTING_DEFAULTS: Settings = {
  language: "system",
  "theme.mode": "system",
  "profile.name": "",
  "home.blocks": ["libraries", "random-pick", "recent-activity"],
  "home.libraries": ["in_progress", "planned", "completed"],
  "rating_display.default": "stars_5",
};

const isOneOf =
  <T extends string>(values: readonly T[]) =>
  (value: unknown): value is T =>
    typeof value === "string" && (values as readonly string[]).includes(value);

const isUniqueListOf =
  <T extends string>(values: readonly T[]) =>
  (value: unknown): value is T[] =>
    Array.isArray(value) && value.every(isOneOf(values)) && new Set(value).size === value.length;

/** Checks a stored value, so a broken or older value falls back to the default instead of breaking the app. */
export function isValidSettingValue(key: string, value: unknown): boolean {
  if (key === "language") return value === "system" || isOneOf(LANGUAGES)(value);
  if (key === "theme.mode") return isOneOf(THEME_MODES)(value);
  if (key === "profile.name") return typeof value === "string" && value.length <= PROFILE_NAME_MAX_LENGTH;
  if (key === "home.blocks") return isUniqueListOf(HOME_BLOCKS)(value);
  if (key === "home.libraries") return isUniqueListOf(RECORD_STATUSES)(value);
  if (key.startsWith("add_mode.")) return isOneOf(ADD_MODES)(value);
  if (key === "rating_display.default") return isOneOf(RATING_SCALES)(value);
  if (key.startsWith("rating_display.")) return value === "default" || isOneOf(RATING_SCALES)(value);
  return false;
}

/** The rating scale to show for a record type: its own setting, or the global default. */
export function ratingScaleFor(settings: Settings, templateId: string): RatingScale {
  const own = settings[`rating_display.${templateId}`];
  return own === undefined || own === "default" ? settings["rating_display.default"] : own;
}
