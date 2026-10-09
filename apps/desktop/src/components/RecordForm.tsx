import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  createRecord,
  DataValidationError,
  fromDisplayRating,
  loadEffectiveTemplate,
  RECORD_STATUSES,
  ratingScaleSpec,
  type DataIssue,
  type EffectiveTemplate,
  type FieldValue,
  type MediaRecord,
  type RatingScale,
  type RecordStatus,
} from "@remedia/core";
import { data } from "../db/database";
import { FieldInput } from "./FieldInput";
import "./RecordForm.css";

// TODO: read from settings (global default + per-type override) once settings are stored.
const RATING_SCALE: RatingScale = "stars_5";

type FormFields = Record<string, FieldValue | undefined>;

/** List fields are typed as "a, b, c" in one box; split them before saving. */
function toFieldValues(template: EffectiveTemplate, values: FormFields): FormFields {
  const result: FormFields = { ...values };
  for (const field of template.fields) {
    const value = result[field.key];
    if (field.type === "text_list" && typeof value === "string") result[field.key] = value.split(",");
  }
  return result;
}

interface RecordFormProps {
  templateId: string;
  onSaved: (record: MediaRecord) => void;
  onCancel: () => void;
}

/** Manual-mode form for a new record. Core validates; the form only collects values and shows errors. */
export function RecordForm({ templateId, onSaved, onCancel }: RecordFormProps) {
  const { t } = useTranslation();

  const [template, setTemplate] = useState<EffectiveTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [status, setStatus] = useState<RecordStatus>("planned");
  const [rating, setRating] = useState<number | null>(null); // on the display scale
  const [notes, setNotes] = useState("");
  const [fields, setFields] = useState<FormFields>({});
  const [issues, setIssues] = useState<DataIssue[]>([]);
  const [saving, setSaving] = useState(false);

  // Load the template once, when the form appears (like ngOnInit).
  useEffect(() => {
    loadEffectiveTemplate(data, templateId).then((t) => setTemplate(t ?? null));
  }, [templateId]);

  const errorFor = (path: string) => {
    const issue = issues.find((i) => i.path === path);
    return issue ? t(`errors.${issue.code}`) : undefined;
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); // stop the browser from reloading the page
    if (!template) return;
    setSaving(true);
    try {
      const record = await createRecord(data, {
        template: templateId,
        title,
        original_title: originalTitle,
        status,
        rating: rating === null ? null : fromDisplayRating(rating, RATING_SCALE),
        notes,
        fields: toFieldValues(template, fields),
      });
      onSaved(record);
    } catch (error) {
      if (error instanceof DataValidationError) setIssues(error.issues);
      else setIssues([{ path: "form", code: "save_failed" }]);
    } finally {
      setSaving(false);
    }
  }

  if (!template) return <p className="screen-placeholder">{t("form.loading")}</p>;

  const { max, step } = ratingScaleSpec(RATING_SCALE);
  const ratingOptions = Array.from({ length: max / step }, (_, i) => (i + 1) * step);

  return (
    <form className="record-form" onSubmit={handleSubmit} noValidate>
      <div className="form-section">
        <div className="form-field">
          <label htmlFor="title" className="label">{t("record.title")} *</label>
          <input id="title" value={title} autoFocus onChange={(e) => setTitle(e.target.value)} />
          {errorFor("title") && <p className="form-error">{errorFor("title")}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="original-title" className="label">{t("record.originalTitle")}</label>
          <input id="original-title" value={originalTitle} onChange={(e) => setOriginalTitle(e.target.value)} />
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="status" className="label">{t("record.status")}</label>
            <select id="status" value={status} onChange={(e) => setStatus(e.target.value as RecordStatus)}>
              {RECORD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t([`status.${templateId}.${s}`, `status.default.${s}`])}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="rating" className="label">{t("record.rating")}</label>
            <select
              id="rating"
              value={rating ?? ""}
              onChange={(e) => setRating(e.target.value === "" ? null : Number(e.target.value))}
            >
              <option value="">{t("record.notRated")}</option>
              {ratingOptions.map((r) => (
                <option key={r} value={r}>
                  {"★".repeat(r)}
                </option>
              ))}
            </select>
            {errorFor("rating") && <p className="form-error">{errorFor("rating")}</p>}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2>{t("record.details")}</h2>
        {template.fields
          .filter((field) => !field.hidden)
          .map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={fields[field.key]}
              onChange={(value) => setFields((current) => ({ ...current, [field.key]: value }))}
              error={errorFor(`fields.${field.key}`)}
            />
          ))}
      </div>

      <div className="form-section">
        <div className="form-field">
          <label htmlFor="notes" className="label">{t("record.notes")}</label>
          <textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {errorFor("form") && <p className="form-error">{errorFor("form")}</p>}

      <div className="form-actions">
        <button type="button" className="button" onClick={onCancel}>
          {t("form.cancel")}
        </button>
        <button type="submit" className="button button--primary" disabled={saving}>
          {t("form.save")}
        </button>
      </div>
    </form>
  );
}
