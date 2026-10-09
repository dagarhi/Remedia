import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";

export const SUPPORTED_LANGUAGES = ["en", "es"] as const;

/** Pre-selects the system language when supported; English otherwise. */
function systemLanguage(): string {
  const lang = navigator.language.slice(0, 2);
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang) ? lang : "en";
}

// TODO: read the language from settings once settings are stored.
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: systemLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React already escapes output
});

export default i18n;
