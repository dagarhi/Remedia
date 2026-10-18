import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SquarePlus } from "lucide-react";
import {
  createRecord,
  type LinkInput,
  type MediaRecord,
  type Provider,
  type ProviderRecord,
  type SearchResult,
  type SeasonInput,
  type Uuid,
} from "@remedia/core";
import { ModeDialog } from "../add/ModeDialog";
import { ProviderSearch } from "../add/ProviderSearch";
import { RecordForm } from "../components/RecordForm";
import { TypeCard } from "../components/TypeCard";
import { data } from "../db/database";
import { systemLanguage } from "../i18n";
import { importImageUrl, providerContext } from "../providers";
import { RECORD_TYPES } from "../recordTypes";
import { useSettings } from "../settings/SettingsContext";
import "../components/TagInput.css";
import "./LibrariesScreen.css";
import "./AddScreen.css";
import { Spinner } from "../components/Spinner";

type Step =
  | { kind: "type" }
  | { kind: "mode"; template: string }
  | { kind: "search"; template: string }
  | { kind: "loading"; template: string }
  | {
      kind: "form";
      template: string;
      prefill?: { values: ProviderRecord["values"]; cover: string | null };
      links?: LinkInput[];
      seasons?: SeasonInput[];
    };

interface AddScreenProps {
  onSaved: (record: MediaRecord) => void;
  onCancel: () => void;
  onOpenRecord: (id: Uuid) => void;
  onOpenSettings: () => void;
}

/**
 * Add flow (UI Design): type -> mode (only while the type is set to "ask") -> search a
 * provider or go manual -> the record form, pre-filled or empty. Both modes produce the
 * same kind of record; the mode is never stored.
 */
export function AddScreen({ onSaved, onCancel, onOpenRecord, onOpenSettings }: AddScreenProps) {
  const { t } = useTranslation();
  const { settings, update } = useSettings();
  const [step, setStep] = useState<Step>({ kind: "type" });
  const [lookupFailed, setLookupFailed] = useState(false);
  const language = settings.language === "system" ? systemLanguage() : settings.language;

  function chooseType(template: string) {
    const mode = settings[`add_mode.${template}`] ?? "ask";
    if (mode === "ask") setStep({ kind: "mode", template });
    else setStep(mode === "automatic" ? { kind: "search", template } : { kind: "form", template });
  }

  /** Fetches the details, downloads the poster locally and opens the pre-filled form. */
  async function pick(template: string, provider: Provider, result: SearchResult) {
    setStep({ kind: "loading", template });
    setLookupFailed(false);
    try {
      const record = await provider.details(await providerContext(language), template, result);
      const cover = record.posterUrl ? await importImageUrl(record.posterUrl, "covers").catch(() => null) : null;
      setStep({
        kind: "form",
        template,
        prefill: { values: record.values, cover },
        links: record.links,
        seasons: record.seasons,
      });
    } catch {
      setLookupFailed(true);
      setStep({ kind: "search", template });
    }
  }

  /** Series from a provider also get their seasons, with episode counts (data model, seasons). */
  async function saved(record: MediaRecord, seasons: SeasonInput[] | undefined) {
    for (const season of seasons ?? []) {
      await createRecord(data, {
        template: "season",
        parent_id: record.id,
        title: season.title || t("season.title", { number: season.number }),
        fields: {
          season_number: season.number,
          episode_count: season.episodeCount ?? undefined,
          air_date: season.airDate ?? undefined,
        },
      });
    }
    onSaved(record);
  }

  if (step.kind === "type" || step.kind === "mode") {
    return (
      <section className="screen">
        <h1>{t("add.title")}</h1>
        <p className="screen-placeholder">{t("add.chooseType")}</p>
        <div className="type-grid">
          {RECORD_TYPES.map((type) => (
            <TypeCard
              key={type.id}
              label={t(`types.${type.id}`)}
              icon={type.icon}
              disabled={!type.enabled}
              onSelect={() => chooseType(type.id)}
            />
          ))}
          {/* Becomes active with custom templates (roadmap phase 6). */}
          <TypeCard label={t("types.custom")} icon={SquarePlus} disabled onSelect={() => {}} />
        </div>
        {step.kind === "mode" && (
          <ModeDialog
            templateId={step.template}
            onCancel={() => setStep({ kind: "type" })}
            onChoose={(mode, remember) => {
              if (remember) update(`add_mode.${step.template}`, mode);
              setStep(mode === "automatic" ? { kind: "search", template: step.template } : { kind: "form", template: step.template });
            }}
          />
        )}
      </section>
    );
  }

  const heading = t("add.newRecord", { type: t(`types.${step.template}`) });

  if (step.kind === "search" || step.kind === "loading") {
    return (
      <section className="screen">
        <h1>{heading}</h1>
        {lookupFailed && <p className="form-error">{t("search.errors.details")}</p>}
        {step.kind === "loading" ? (
          <p className="screen-placeholder loading" role="status">
            <Spinner size={20} />
            {t("search.loadingDetails")}
          </p>
        ) : (
          <ProviderSearch
            templateId={step.template}
            onPick={(provider, result) => pick(step.template, provider, result)}
            onManual={(title) => setStep({ kind: "form", template: step.template, prefill: { values: { title }, cover: null } })}
            onOpenExisting={onOpenRecord}
            onOpenSettings={onOpenSettings}
          />
        )}
      </section>
    );
  }

  return (
    <section className="screen">
      <h1>{heading}</h1>
      <RecordForm
        templateId={step.template}
        prefill={step.prefill}
        links={step.links}
        onSaved={(record) => saved(record, step.seasons)}
        onCancel={onCancel}
      />
    </section>
  );
}
