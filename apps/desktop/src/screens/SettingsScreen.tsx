import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  ADD_MODES,
  isConfigured,
  PROVIDERS,
  LANGUAGES,
  PROFILE_NAME_MAX_LENGTH,
  RATING_SCALES,
  THEME_MODES,
  type AddMode,
  type ProviderCredentials, type Language, type RatingScale, type ThemeMode } from "@remedia/core";
import { AvatarPicker } from "../components/AvatarPicker";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Select } from "../components/Select";
import { RECORD_TYPES } from "../recordTypes";
import { credentialsPath, getCredentials, setCredentials } from "../providers";
import { useSettings } from "../settings/SettingsContext";
import "./LibrariesScreen.css";
import "../components/TagInput.css";
import "./SettingsScreen.css";

const SECTIONS = ["profile", "appearance", "recordTypes", "services", "myData", "about"] as const;
type Section = (typeof SECTIONS)[number];

const REPOSITORY_URL = "https://github.com/dagarhi/Remedia";

/** Native names: a language is always shown in itself, whatever the current language. */
const LANGUAGE_NAMES: Record<Language, string> = { en: "English", es: "Español" };

/** Standard desktop settings: section menu on the left, content on the right, changes apply at once. */
export function SettingsScreen() {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>("profile");

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
          {section === "profile" && <ProfileSettings />}
          {section === "appearance" && <AppearanceSettings />}
          {section === "recordTypes" && <RecordTypeSettings />}
          {section === "services" && <ServicesSettings />}
          {section === "myData" && <MyDataSettings />}
          {section === "about" && <AboutSettings />}
        </div>
      </div>
    </section>
  );
}

function ProfileSettings() {
  const { t } = useTranslation();
  const { settings, update } = useSettings();
  // Typed locally and saved when the field loses focus, not on every key press.
  const [name, setName] = useState(settings["profile.name"]);

  return (
    <div className="settings-section">
      <div className="settings-row">
        <label htmlFor="profile-name" className="label">{t("settings.name")}</label>
        <input
          id="profile-name"
          className="settings-input"
          value={name}
          maxLength={PROFILE_NAME_MAX_LENGTH}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => update("profile.name", name.trim())}
        />
      </div>
      <p className="screen-placeholder">{t("settings.nameHint")}</p>
      <span className="label">{t("profile.avatar")}</span>
      <AvatarPicker value={settings["profile.avatar"]} onChange={(avatar) => update("profile.avatar", avatar)} />
    </div>
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

      <h2>{t("settings.addMode")}</h2>
      {RECORD_TYPES.filter((type) => type.enabled).map((type) => {
        const key = `add_mode.${type.id}` as const;
        return (
          <div key={type.id} className="settings-row">
            <label htmlFor={key} className="label">{t(`types.${type.id}`)}</label>
            <Select id={key} value={settings[key] ?? "ask"} onChange={(e) => update(key, e.target.value as AddMode)}>
              {ADD_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {t(`settings.addModes.${mode}`)}
                </option>
              ))}
            </Select>
          </div>
        );
      })}
    </div>
  );
}

/** External services (UI Design): one row per provider with its types and status, then the keys. */
function ServicesSettings() {
  const { t } = useTranslation();
  // What is saved, and what is being typed: { section: { field: value } }.
  const [credentials, setCreds] = useState<ProviderCredentials | null>(null);
  const [draft, setDraft] = useState<ProviderCredentials>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getCredentials()
      .then((c) => {
        setCreds(c);
        setDraft(c);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const value = (section: string, field: string) => draft[section]?.[field] ?? "";

  function edit(section: string, field: string, text: string) {
    setDraft((current) => ({ ...current, [section]: { ...current[section], [field]: text } }));
    setSaved(false);
  }

  async function save() {
    // Trimmed values only; the file is rewritten with its explanatory comments.
    const clean: ProviderCredentials = {};
    for (const [section, fields] of Object.entries(draft)) {
      clean[section] = Object.fromEntries(Object.entries(fields ?? {}).map(([k, v]) => [k, v.trim()]));
    }
    await setCredentials(clean);
    setCreds(clean);
    setSaved(true);
  }

  const withKeys = PROVIDERS.filter((p) => p.manifest.settings);

  return (
    <div className="settings-section">
      <p>{t("settings.services.intro")}</p>
      {error && <p className="form-error">{t("settings.services.malformed", { error })}</p>}

      {PROVIDERS.map((provider) => {
        const configured = credentials ? isConfigured(provider, credentials) : !provider.manifest.settings;
        return (
          <div key={provider.id} className="service-row">
            <div className="service-info">
              <span className="service-name">{t(`providers.${provider.id}.name`)}</span>
              <span className="screen-placeholder">
                {provider.manifest.recordTypes.map((tpl) => t(`types.${tpl}`)).join(", ")}
              </span>
            </div>
            <span className={configured ? "tag" : "tag tag--suggestion"}>
              {t(
                !provider.manifest.settings
                  ? "settings.services.noKeyNeeded"
                  : configured
                    ? "settings.services.ready"
                    : "settings.services.needsKey",
              )}
            </span>
          </div>
        );
      })}

      <h2>{t("settings.services.keys")}</h2>
      {withKeys.map((provider) => {
        const { section, fields } = provider.manifest.settings!;
        return (
          <div key={provider.id} className="service-keys">
            <span className="service-name">{t(`providers.${provider.id}.name`)}</span>
            <p className="screen-placeholder">{t(`providers.${provider.id}.help`)}</p>
            {fields.map(({ key: field, type }) => {
              const id = `${section}-${field}`;
              return (
                <div key={field} className="settings-row">
                  <label htmlFor={id} className="label">{t(`settings.services.fields.${field}`)}</label>
                  <input
                    id={id}
                    // Secrets are hidden as they are typed; plain ids (like a Twitch Client ID) are not.
                    type={type === "secret" ? "password" : "text"}
                    className="settings-input"
                    autoComplete="off"
                    value={value(section, field)}
                    onChange={(e) => edit(section, field, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="settings-actions">
        <button type="button" className="button button--primary" onClick={save}>
          {t("form.save")}
        </button>
        {saved && <span className="screen-placeholder">{t("settings.services.saved")}</span>}
        <button type="button" className="link-button" onClick={async () => revealItemInDir(await credentialsPath())}>
          {t("settings.services.openFolder")}
        </button>
      </div>
      <p className="screen-placeholder">{t("settings.services.privacy")}</p>
    </div>
  );
}

/** "Remedia backup 2026-10-11 1530": sortable, and valid as a folder name on every system. */
function backupName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `Remedia backup ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function MyDataSettings() {
  const { t } = useTranslation();
  const [state, setState] = useState<{ kind: "idle" | "working" } | { kind: "done"; path: string } | { kind: "error" }>({
    kind: "idle",
  });

  async function backup() {
    const parent = await open({ directory: true, multiple: false, title: t("settings.backup.choose") });
    if (!parent) return;
    setState({ kind: "working" });
    try {
      const path = await invoke<string>("create_backup", { parent, name: backupName() });
      setState({ kind: "done", path });
    } catch {
      setState({ kind: "error" });
    }
  }

  return (
    <div className="settings-section">
      <h2>{t("settings.backup.title")}</h2>
      <p>{t("settings.backup.description")}</p>
      <div>
        <button type="button" className="button button--primary" disabled={state.kind === "working"} onClick={backup}>
          {t(state.kind === "working" ? "settings.backup.working" : "settings.backup.create")}
        </button>
      </div>
      {state.kind === "done" && (
        <p>
          {t("settings.backup.done")}{" "}
          <button type="button" className="link-button" onClick={() => revealItemInDir(state.path)}>
            {t("settings.backup.show")}
          </button>
        </p>
      )}
      {state.kind === "error" && <p className="form-error">{t("settings.backup.failed")}</p>}

      <RestoreBackup />
    </div>
  );
}

type RestoreState =
  | { kind: "idle" }
  | { kind: "confirming"; folder: string }
  | { kind: "working" }
  | { kind: "done"; safetyCopy: string }
  | { kind: "error"; code: string };

/** Restores a backup folder, after confirming; the app saves a safety copy of the current data first. */
function RestoreBackup() {
  const { t } = useTranslation();
  const [state, setState] = useState<RestoreState>({ kind: "idle" });

  async function choose() {
    const folder = await open({ directory: true, multiple: false, title: t("settings.restore.choose") });
    if (folder) setState({ kind: "confirming", folder });
  }

  async function restore(folder: string) {
    setState({ kind: "working" });
    try {
      const safetyCopy = await invoke<string>("restore_backup", { folder });
      setState({ kind: "done", safetyCopy });
    } catch (error) {
      const code = String(error);
      setState({ kind: "error", code: ["not_a_backup", "backup_from_newer_version"].includes(code) ? code : "failed" });
    }
  }

  return (
    <>
      <h2>{t("settings.restore.title")}</h2>
      <p>{t("settings.restore.description")}</p>
      <div>
        <button type="button" className="button" disabled={state.kind === "working"} onClick={choose}>
          {t(state.kind === "working" ? "settings.restore.working" : "settings.restore.button")}
        </button>
      </div>

      {state.kind === "done" && (
        <div className="settings-section">
          <p>{t("settings.restore.done")}</p>
          <div className="settings-actions">
            {/* Everything on screen still shows the old data: reloading reads the restored one. */}
            <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
              {t("settings.restore.reload")}
            </button>
            <button type="button" className="link-button" onClick={() => revealItemInDir(state.safetyCopy)}>
              {t("settings.restore.showSafetyCopy")}
            </button>
          </div>
        </div>
      )}
      {state.kind === "error" && <p className="form-error">{t(`settings.restore.errors.${state.code}`)}</p>}

      <ConfirmDialog
        open={state.kind === "confirming"}
        title={t("settings.restore.confirmTitle")}
        message={t("settings.restore.confirmMessage", { folder: state.kind === "confirming" ? state.folder : "" })}
        confirmLabel={t("settings.restore.confirm")}
        cancelLabel={t("form.cancel")}
        onConfirm={() => state.kind === "confirming" && restore(state.folder)}
        onCancel={() => setState({ kind: "idle" })}
      />
    </>
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
