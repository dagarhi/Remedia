import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  formatRating,
  loadSettings,
  ratingScaleFor,
  saveSetting,
  type RatingScale,
  type Settings,
} from "@remedia/core";
import { data } from "../db/database";
import i18n, { systemLanguage } from "../i18n";
import { useTheme } from "../theme/useTheme";

interface SettingsContextValue {
  settings: Settings;
  /** Changes a setting: applied at once and saved in the database (no Save button). */
  update: <K extends keyof Settings & string>(key: K, value: NonNullable<Settings[K]>) => void;
}

/*
 * A React context makes one value available to every component below the provider,
 * without passing it as a prop through each level (similar to an Angular root service).
 */
const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Loads the settings once, applies language and theme, and shares them with the whole app. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    loadSettings(data).then(setSettings);
  }, []);

  // Language: "system" follows the operating system.
  const language = settings?.language;
  useEffect(() => {
    if (language) i18n.changeLanguage(language === "system" ? systemLanguage() : language);
  }, [language]);

  useTheme(settings?.["theme.mode"] ?? "system");

  // Nothing to show until the settings are known, so the app never flashes the wrong language.
  if (!settings) return null;

  const update: SettingsContextValue["update"] = (key, value) => {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
    saveSetting(data, key, value);
  };

  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside <SettingsProvider>");
  return value;
}

/** The rating scale chosen for a record type. */
export function useRatingScale(templateId: string): RatingScale {
  return ratingScaleFor(useSettings().settings, templateId);
}

/** Formats stored ratings on each type's chosen scale: "★★★½", "7/10"… */
export function useFormatRating(): (stored: number, templateId: string) => string {
  const { settings } = useSettings();
  return (stored, templateId) => formatRating(stored, ratingScaleFor(settings, templateId));
}
