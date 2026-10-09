/** Theme file format version this app understands. Higher versions are rejected. */
export const THEME_FORMAT_VERSION = 1;

export const THEME_APPEARANCES = ["light", "dark"] as const;

export type ThemeAppearance = (typeof THEME_APPEARANCES)[number];

/** Hex colour `#RRGGBB`. */
export type HexColor = string;

export interface ThemeColors {
  background: HexColor;
  surface: HexColor;
  surfaceRaised: HexColor;
  /** Decorative dividers only. */
  border: HexColor;
  /** Fields and controls (3:1 or more). */
  borderStrong: HexColor;
  text: HexColor;
  textSecondary: HexColor;
  textDisabled: HexColor;
  /** Fill: buttons, progress bars. */
  accent: HexColor;
  /** Text and icons on `accent`. */
  onAccent: HexColor;
  /** Accent as text or icon; also the focus ring. */
  accentText: HexColor;
  danger: HexColor;
  success: HexColor;
}

export interface ThemeTypography {
  /** Font stacks: the first available font wins. */
  heading: string[];
  body: string[];
  labelCase: "uppercase" | "normal";
}

export interface ThemeShape {
  /** Unitless: px on desktop, density-independent units on React Native. */
  radiusControl: number;
  radiusCard: number;
  radiusCover: number;
  radiusTag: number | "full";
  borderWidth: number;
  /** Only "none" for now: the shadow definition format is not decided yet. */
  shadowRaised: "none";
}

interface ThemeMeta {
  $schema?: string;
  formatVersion: number;
  /** Unique, lowercase kebab-case. */
  id: string;
  name: string;
  author?: string;
  appearance: ThemeAppearance;
}

/** A theme file as written on disk. Missing tokens are filled from the built-in theme with the same appearance. */
export interface ThemeFile extends ThemeMeta {
  colors?: Partial<ThemeColors>;
  typography?: Partial<ThemeTypography>;
  shape?: Partial<ThemeShape>;
}

/** A theme with every token set: the built-in themes, and any file after merging. */
export interface Theme extends ThemeMeta {
  colors: ThemeColors;
  typography: ThemeTypography;
  shape: ThemeShape;
}
