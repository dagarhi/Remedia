import {
  THEME_FORMAT_VERSION,
  type Theme,
  type ThemeAppearance,
  type ThemeShape,
  type ThemeTypography,
} from "./types";

// Starting values from the Themes Spec; to be tuned inside the real app.

const typography: ThemeTypography = {
  heading: ["Literata", "Georgia", "serif"],
  body: ["Inter", "system-ui", "sans-serif"],
  labelCase: "uppercase",
};

const shape: ThemeShape = {
  radiusControl: 8,
  radiusCard: 12,
  radiusCover: 6,
  radiusTag: "full",
  borderWidth: 1,
  shadowRaised: "none",
};

/** The reference theme: designed first, the light theme is derived from it. */
export const remediaDark: Theme = {
  formatVersion: THEME_FORMAT_VERSION,
  id: "remedia-dark",
  name: "Remedia Dark",
  author: "Remedia",
  appearance: "dark",
  colors: {
    background: "#1C1916",
    surface: "#26211D",
    surfaceRaised: "#302A25",
    border: "#3A332D",
    borderStrong: "#7E756A",
    text: "#EDE6DA",
    textSecondary: "#A39A8E",
    textDisabled: "#6B6258",
    accent: "#D9A25F",
    onAccent: "#2A1C0B",
    accentText: "#D9A25F",
    danger: "#E5897A",
    success: "#A3BA96",
  },
  typography,
  shape,
};

export const remediaLight: Theme = {
  formatVersion: THEME_FORMAT_VERSION,
  id: "remedia-light",
  name: "Remedia Light",
  author: "Remedia",
  appearance: "light",
  colors: {
    background: "#F5EFE4",
    surface: "#FBF8F2",
    surfaceRaised: "#FFFDF9",
    border: "#E4DBCC",
    borderStrong: "#8E8476",
    text: "#2B2620",
    textSecondary: "#6E655A",
    textDisabled: "#B5AC9F",
    accent: "#D9A25F",
    onAccent: "#2A1C0B",
    accentText: "#8F5B1C",
    danger: "#A9472F",
    success: "#4F6B45",
  },
  typography,
  shape,
};

/** Built-in theme per appearance; also the fallback for missing tokens. */
export const BUILT_IN_THEMES: Record<ThemeAppearance, Theme> = {
  dark: remediaDark,
  light: remediaLight,
};
