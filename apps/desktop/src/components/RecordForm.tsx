import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  createRecord,
  DataValidationError,
  loadEffectiveTemplate,
  updateRecord,
  type DataIssue,
  type EffectiveTemplate,
  type FieldValue,
  type MediaRecord,
  type RecordStatus,
} from "@remedia/core";
import { data } from "../db/database";
import { CoverPicker } from "./CoverPicker";
import { FieldInput } from "./FieldInput";
import { RatingSelect } from "./RatingSelect";
import { StatusSelect } from "./StatusSelect";
import { TagInput } from "./TagInput";
import "./RecordForm.css";

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
  /** The record to edit. Without it, the form creates a new record. */
  record?: MediaRecord;
  /** The record's current cover, when editing. */
  cover?: string | null;
  /** The record's current tag names, when editing. */
  tags?: string[];
  onSaved: (record: MediaRecord) => void;
  onCancel: () => void;
  /** Shows a Delete button (edit mode only). */
  onDelete?: () => void;
}

/**
 * The record form, used both to add (manual mode) and to edit. Core validates;
 * the form only collects values and shows errors.
 */
export function RecordForm({
  templateId,
  record,
  cover: initialCover,
  tags: initialTags,
  onSaved,
  onCancel,
  onDelete,
}: RecordFormProps) {
  const { t } = useTranslation();

  // Initial values: the record's when editing, empty when adding.
  const [template, setTemplate] = useState<EffectiveTemplate | null>(null);
  const [title, setTitle] = useState(record?.title ?? "");
  const [originalTitle, setOriginalTitle] = useState(record?.original_title ?? "");
  const [status, setStatus] = useState<RecordStatus>(record?.status ?? "planned");
  const [rating, setRating] = useState<number | null>(record?.rating ?? null); // stored scale, 1-100
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [cover, setCover] = useState<string | null>(initialCover ?? null);
  const [tags, setTags] = useState<string[]>(initialTags ?? []);
  // Starts with every stored key, including hidden fields and keys from newer versions, so none is lost.
  const [fields, setFields] = useState<FormFields>(record?.fields ?? {});
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
      const values = {
        title,
        original_title: originalTitle,
        status,
        rating,
        notes,
        fields: toFieldValues(template, fields),
        cover,
        tags,
      };
      const saved = record
        ? await updateRecord(data, record.id, values)
        : await createRecord(data, { template: templateId, ...values });
      onSaved(saved);
    } catch (error) {
      if (error instanceof DataValidationError) setIssues(error.issues);
      else setIssues([{ path: "form", code: "save_failed" }]);
    } finally {
      setSaving(false);
    }
  }

  if (!template) return <p className="screen-placeholder">{t("form.loading")}</p>;

  return (
    <form className="record-form" onSubmit={handleSubmit} noValidate>
      <div className="form-section">
        <span className="label">{t("cover.label")}</span>
        <CoverPicker templateId={templateId} value={cover} onChange={setCover} />
        {errorFor("cover") && <p className="form-error">{errorFor("cover")}</p>}
      </div>

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
            <StatusSelect id="status" templateId={templateId} value={status} onChange={setStatus} />
          </div>

          <div className="form-field">
            <label htmlFor="rating" className="label">{t("record.rating")}</label>
            <RatingSelect id="rating" templateId={templateId} value={rating} onChange={setRating} />
            {errorFor("rating") && <p className="form-error">{errorFor("rating")}</p>}
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="tags" className="label">{t("tags.label")}</label>
          <TagInput templateId={templateId} value={tags} onChange={setTags} />
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
        {onDelete && (
          <button type="button" className="button button--danger" onClick={onDelete}>
            {t("form.delete")}
          </button>
        )}
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
