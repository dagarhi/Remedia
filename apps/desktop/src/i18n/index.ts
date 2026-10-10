import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { LANGUAGES, type Language } from "@remedia/core";
import en from "./locales/en.json";
import es from "./locales/es.json";

/** The operating system language when supported; English otherwise. */
export function systemLanguage(): Language {
  const lang = navigator.language.slice(0, 2);
  return (LANGUAGES as readonly string[]).includes(lang) ? (lang as Language) : "en";
}

// Starts in the system language; SettingsProvider switches to the saved choice once loaded.
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: systemLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React already escapes output
});

export default i18n;
