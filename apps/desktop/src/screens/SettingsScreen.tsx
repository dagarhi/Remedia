import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { LANGUAGES, RATING_SCALES, THEME_MODES, type Language, type RatingScale, type ThemeMode } from "@remedia/core";
import { Select } from "../components/Select";
import { RECORD_TYPES } from "../recordTypes";
import { useSettings } from "../settings/SettingsContext";
import "./LibrariesScreen.css";
import "./SettingsScreen.css";

const SECTIONS = ["appearance", "recordTypes", "about"] as const;
type Section = (typeof SECTIONS)[number];

const REPOSITORY_URL = "https://github.com/dagarhi/Remedia";

/** Native names: a language is always shown in itself, whatever the current language. */
const LANGUAGE_NAMES: Record<Language, string> = { en: "English", es: "Español" };

/** Standard desktop settings: section menu on the left, content on the right, changes apply at once. */
export function SettingsScreen() {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>("appearance");

  return (
    <section className="screen">
      <h1>{t("settings.title")}</h1>
      <div className="settings">
        <nav className="settings-menu">
          {SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="settings-menu-item"
              aria-current={section === s ? "page" : undefined}
              onClick={() => setSection(s)}
            >
              {t(`settings.sections.${s}`)}
            </button>
          ))}
        </nav>
        <div className="settings-content">
          {section === "appearance" && <AppearanceSettings />}
          {section === "recordTypes" && <RecordTypeSettings />}
          {section === "about" && <AboutSettings />}
        </div>
      </div>
    </section>
  );
}

function AppearanceSettings() {
  const { t } = useTranslation();
  const { settings, update } = useSettings();

  return (
    <div className="settings-section">
      <div className="settings-row">
        <label htmlFor="language" className="label">{t("settings.language")}</label>
        <Select
          id="language"
          value={settings.language}
          onChange={(e) => update("language", e.target.value as Language | "system")}
        >
          <option value="system">{t("settings.followSystem")}</option>
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {LANGUAGE_NAMES[lang]}
            </option>
          ))}
        </Select>
      </div>

      <div className="settings-row">
        <label htmlFor="theme" className="label">{t("settings.theme")}</label>
        <Select
          id="theme"
          value={settings["theme.mode"]}
          onChange={(e) => update("theme.mode", e.target.value as ThemeMode)}
        >
          {THEME_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`settings.themeModes.${mode}`)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function RecordTypeSettings() {
  const { t } = useTranslation();
  const { settings, update } = useSettings();

  return (
    <div className="settings-section">
      <div className="settings-row">
        <label htmlFor="rating-default" className="label">{t("settings.ratingDefault")}</label>
        <Select
          id="rating-default"
          value={settings["rating_display.default"]}
          onChange={(e) => update("rating_display.default", e.target.value as RatingScale)}
        >
          {RATING_SCALES.map((scale) => (
            <option key={scale} value={scale}>
              {t(`settings.ratingScales.${scale}`)}
            </option>
          ))}
        </Select>
      </div>

      <h2>{t("settings.perType")}</h2>
      {RECORD_TYPES.filter((type) => type.enabled).map((type) => {
        const key = `rating_display.${type.id}` as const;
        return (
          <div key={type.id} className="settings-row">
            <label htmlFor={key} className="label">{t(`types.${type.id}`)}</label>
            <Select
              id={key}
              value={settings[key] ?? "default"}
              onChange={(e) => update(key, e.target.value as RatingScale | "default")}
            >
              <option value="default">{t("settings.useDefault")}</option>
              {RATING_SCALES.map((scale) => (
                <option key={scale} value={scale}>
                  {t(`settings.ratingScales.${scale}`)}
                </option>
              ))}
            </Select>
          </div>
        );
      })}
      <p className="screen-placeholder">{t("settings.ratingHint")}</p>
    </div>
  );
}

function AboutSettings() {
  const { t } = useTranslation();
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  return (
    <div className="settings-section">
      <p className="settings-app-name">{t("app.name")}</p>
      <p>{t("app.tagline")}</p>
      <dl className="record-details">
        <div>
          <dt className="label">{t("settings.version")}</dt>
          <dd>{version}</dd>
        </div>
        <div>
          <dt className="label">{t("settings.licence")}</dt>
          <dd>MIT</dd>
        </div>
      </dl>
      <button type="button" className="link-button" onClick={() => openUrl(REPOSITORY_URL)}>
        {t("settings.sourceCode")}
      </button>
    </div>
  );
}
