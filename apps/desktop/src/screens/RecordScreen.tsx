import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  buildEffectiveTemplate,
  codeTemplateFor,
  getRecord,
  toDisplayRating,
  type MediaRecord,
  type Uuid,
} from "@remedia/core";
import { useLabel } from "../components/FieldInput";
import { data } from "../db/database";
import { ArrowLeft } from "lucide-react";
import "./LibrariesScreen.css"

/**
 * Minimal read-only record page, so a saved record can be seen.
 * The full page (header, inline edits, history, edit mode) is the next roadmap step.
 */
export function RecordScreen({ id, onBack }: { id: Uuid; onBack: () => void }) {
  const { t } = useTranslation();
  const label = useLabel();
  // undefined = still loading, null = not found
  const [record, setRecord] = useState<MediaRecord | null | undefined>(undefined);

  useEffect(() => {
    getRecord(data, id).then((r) => setRecord(r ?? null));
  }, [id]);

  if (record === undefined) return <p className="screen-placeholder">{t("form.loading")}</p>;
  if (record === null) return <p className="screen-placeholder">{t("record.notFound")}</p>;

  // TODO: load user template changes too (loadEffectiveTemplate) when templates become editable.
  const template = buildEffectiveTemplate(codeTemplateFor(record.template), {});

  return (
    <section className="screen">
      <button type="button" className="link-button back-button" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden /> {t("libraries.title")}
      </button>
      <p className="label">{t(`types.${record.template}`)}</p>
      <h1>{record.title}</h1>
      {record.original_title && <p className="screen-placeholder">{record.original_title}</p>}
      <p>
        {t([`status.${record.template}.${record.status}`, `status.default.${record.status}`])}
        {record.rating !== null && ` · ${"★".repeat(toDisplayRating(record.rating, "stars_5"))}`}
      </p>
      <dl className="record-details">
        {template.fields
          .filter((f) => record.fields[f.key] !== undefined)
          .map((f) => {
            const value = record.fields[f.key];
            return (
              <div key={f.key}>
                <dt className="label">{label(f.label)}</dt>
                <dd>
                  {Array.isArray(value)
                    ? value.join(", ")
                    : typeof value === "boolean"
                      ? t(value ? "common.yes" : "common.no")
                      : String(value)}
                  {f.unit && ` ${f.unit}`}
                </dd>
              </div>
            );
          })}
      </dl>
      {record.notes && <p>{record.notes}</p>}
    </section>
  );
}
