import { useEffect, useState } from "react";
import { BUILT_IN_THEMES, resolveTheme, type ThemeAppearance, type ThemeMode } from "@remedia/core";
import { applyTheme } from "./applyTheme";

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

/** Follows the operating system's light or dark mode, updating live when it changes. */
function useSystemAppearance(): ThemeAppearance {
  const [appearance, setAppearance] = useState<ThemeAppearance>(darkQuery.matches ? "dark" : "light");

  useEffect(() => {
    const onChange = (e: MediaQueryListEvent) => setAppearance(e.matches ? "dark" : "light");
    darkQuery.addEventListener("change", onChange);
    return () => darkQuery.removeEventListener("change", onChange);
  }, []);

  return appearance;
}

/**
 * Applies the built-in theme for the mode chosen in Settings ("system" follows the OS).
 * TODO: let the user pick which light and dark themes to use, once there are more themes.
 */
export function useTheme(mode: ThemeMode = "system"): ThemeAppearance {
  const system = useSystemAppearance();
  const appearance = mode === "system" ? system : mode;

  useEffect(() => {
    const result = resolveTheme(BUILT_IN_THEMES[appearance]);
    if (result.ok) applyTheme(result.theme);
  }, [appearance]);

  return appearance;
}
