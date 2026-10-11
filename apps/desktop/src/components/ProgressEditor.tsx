import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { EffectiveTemplate, MediaRecord, RecordFields } from "@remedia/core";
import { useProgress } from "../progress";
import { ProgressBar } from "./ProgressBar";
import "./ProgressEditor.css";

interface ProgressEditorProps {
  record: MediaRecord;
  template: EffectiveTemplate;
  /** Saves the record's fields with the new progress value. */
  onSave: (fields: RecordFields) => void;
}

/** Inline progress on the record page: type the current value or press +1 (page, episode, hour). */
export function ProgressEditor({ record, template, onSave }: ProgressEditorProps) {
  const { t } = useTranslation();
  const progress = useProgress()(record);
  const field = template.progress!.field;
  const totalKey = template.progress!.total;
  const stored = typeof record.fields[field] === "number" ? (record.fields[field] as number) : 0;
  const total = totalKey && typeof record.fields[totalKey] === "number" ? (record.fields[totalKey] as number) : null;

  // The box shows what is typed; it saves when leaving it or pressing Enter.
  const [draft, setDraft] = useState(String(stored));
  useEffect(() => setDraft(String(stored)), [stored]);

  function save(value: number) {
    if (!Number.isFinite(value) || value < 0 || value === stored) return;
    onSave({ ...record.fields, [field]: value });
  }

  return (
    <div className="progress-editor">
      <span className="label">{t("progress.label")}</span>
      <div className="progress-editor-row">
        <input
          type="number"
          min={0}
          value={draft}
          aria-label={t("progress.label")}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => save(Number(draft))}
          onKeyDown={(e) => e.key === "Enter" && save(Number(draft))}
        />
        {total !== null && <span className="progress-editor-total">/ {total}</span>}
        <button type="button" className="button" onClick={() => save(stored + 1)}>
          {t("progress.addOne")}
        </button>
      </div>
      {progress && <ProgressBar progress={progress} />}
    </div>
  );
}
