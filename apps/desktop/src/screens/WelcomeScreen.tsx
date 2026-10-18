import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { LANGUAGES, PROFILE_NAME_MAX_LENGTH, THEME_MODES, type Language, type ThemeMode } from "@remedia/core";
import { AvatarPicker } from "../components/AvatarPicker";
import { Select } from "../components/Select";
import { useSettings } from "../settings/SettingsContext";
import "./WelcomeScreen.css";

/** Native names: a language is always shown in itself (see Settings › Appearance). */
const LANGUAGE_NAMES: Record<Language, string> = { en: "English", es: "Español" };

/**
 * First run (UI Design): a basic local profile, then an empty Home. Shown only when the app
 * has no records and no profile yet. Language, theme and avatar apply live as they are chosen.
 */
export function WelcomeScreen() {
  const { t } = useTranslation();
  const { settings, update } = useSettings();
  const [name, setName] = useState(settings["profile.name"]);

  function start(event: FormEvent) {
    event.preventDefault();
    if (name.trim() === "") return;
    update("profile.name", name.trim());
    update("onboarding.done", true);
  }

  return (
    <main className="welcome">
      <form className="welcome-card" onSubmit={start}>
        <header>
          <h1>{t("welcome.title")}</h1>
          <p className="screen-placeholder">{t("app.tagline")}</p>
        </header>

        <div className="welcome-field">
          <label htmlFor="welcome-name" className="label">{t("welcome.name")}</label>
          <input
            id="welcome-name"
            autoFocus
            value={name}
            maxLength={PROFILE_NAME_MAX_LENGTH}
            placeholder={t("welcome.namePlaceholder")}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="welcome-field">
          <span className="label">{t("welcome.avatar")}</span>
          <AvatarPicker value={settings["profile.avatar"]} onChange={(avatar) => update("profile.avatar", avatar)} />
        </div>

        <div className="welcome-row">
          <div className="welcome-field">
            <label htmlFor="welcome-language" className="label">{t("settings.language")}</label>
            <Select
              id="welcome-language"
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
          <div className="welcome-field">
            <label htmlFor="welcome-theme" className="label">{t("settings.theme")}</label>
            <Select
              id="welcome-theme"
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

        <footer className="welcome-actions">
          <span className="screen-placeholder">{t("welcome.private")}</span>
          <button type="submit" className="button button--primary" disabled={name.trim() === ""}>
            {t("welcome.start")} <ArrowRight size={16} aria-hidden />
          </button>
        </footer>
      </form>
    </main>
  );
}
