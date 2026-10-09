import { BUILT_IN_THEMES } from "./builtIn";
import { mixColors } from "./color";
import type { HexColor, Theme, ThemeFile } from "./types";
import { validateThemeFile, type ThemeError, type ThemeWarning } from "./validate";

/** Interaction colours computed from the theme, never written in theme files. */
export interface DerivedColors {
  hover: HexColor;
  selected: HexColor;
  pressed: HexColor;
  focusRing: HexColor;
}

export interface ResolvedTheme extends Theme {
  derived: DerivedColors;
}

// How much of the `text` colour is mixed over `surface` for each state. Starting values, to tune in the app.
const STATE_MIX = { hover: 0.06, selected: 0.1, pressed: 0.14 } as const;

function withoutUndefined<T extends object>(values: T | undefined): Partial<T> {
  return Object.fromEntries(Object.entries(values ?? {}).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Fills every missing token from the built-in theme with the same appearance. */
export function mergeTheme(file: ThemeFile): Theme {
  const base = BUILT_IN_THEMES[file.appearance];
  return {
    ...base,
    $schema: file.$schema,
    formatVersion: file.formatVersion,
    id: file.id,
    name: file.name,
    author: file.author,
    appearance: file.appearance,
    colors: { ...base.colors, ...withoutUndefined(file.colors) },
    typography: { ...base.typography, ...withoutUndefined(file.typography) },
    shape: { ...base.shape, ...withoutUndefined(file.shape) },
  };
}

export function deriveColors(theme: Theme): DerivedColors {
  const { surface, text, accentText } = theme.colors;
  return {
    hover: mixColors(surface, text, STATE_MIX.hover),
    selected: mixColors(surface, text, STATE_MIX.selected),
    pressed: mixColors(surface, text, STATE_MIX.pressed),
    focusRing: accentText,
  };
}

export type ResolveThemeResult =
  | { ok: true; theme: ResolvedTheme; warnings: ThemeWarning[] }
  | { ok: false; error: ThemeError };

/** The shared pipeline: validate, merge, derive. Applying the result is up to each platform. */
export function resolveTheme(input: unknown): ResolveThemeResult {
  const validated = validateThemeFile(input);
  if (!validated.ok) return validated;
  const theme = mergeTheme(validated.theme);
  return { ok: true, theme: { ...theme, derived: deriveColors(theme) }, warnings: validated.warnings };
}
