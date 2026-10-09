import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  buildEffectiveTemplate,
  codeTemplateFor,
  deleteRecord,
  getRecord,
  updateRecord,
  type MediaRecord,
  type RecordChanges,
  type Uuid,
} from "@remedia/core";
import { useLabel } from "../components/FieldInput";
import { HistoryList } from "../components/HistoryList";
import { RatingSelect } from "../components/RatingSelect";
import { RecordForm } from "../components/RecordForm";
import { StatusSelect } from "../components/StatusSelect";
import { data } from "../db/database";
import "./LibrariesScreen.css";
import "./RecordScreen.css";
import { ConfirmDialog } from "../components/ConfirmDialog";  

interface RecordScreenProps {
  id: Uuid;
  onBack: () => void;
  /** Called after the record is deleted, to leave its page. */
  onDeleted: () => void;
}

/**
 * One record: header with inline status and rating, details, notes and history.
 * Edit opens the same page in edit mode (UI Design); covers come in a later step.
 */
export function RecordScreen({ id, onBack, onDeleted }: RecordScreenProps) {
  const { t } = useTranslation();
  const label = useLabel();
  // undefined = still loading, null = not found
  const [record, setRecord] = useState<MediaRecord | null | undefined>(undefined);
  // Bumped after every save so the history reloads and shows the new event.
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    getRecord(data, id).then((r) => setRecord(r ?? null));
  }, [id]);

  /** Inline edits: save at once; core also writes the history line. */
  async function change(changes: RecordChanges) {
    setRecord(await updateRecord(data, id, changes));
    setVersion((v) => v + 1);
  }

  async function handleDelete() {
    await deleteRecord(data, id);
    onDeleted();
  }


  if (record === undefined) return <p className="screen-placeholder">{t("form.loading")}</p>;
  if (record === null) return <p className="screen-placeholder">{t("record.notFound")}</p>;

  if (editing) {
    return (
      <section className="screen">
        <h1>{t("record.editTitle", { title: record.title })}</h1>
        <RecordForm
          templateId={record.template}
          record={record}
          onSaved={(saved) => {
            setRecord(saved);
            setVersion((v) => v + 1);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
          onDelete={() => setConfirmingDelete(true)}
        />
        <ConfirmDialog
          open={confirmingDelete}
          title={t("record.deleteTitle")}
          message={t("record.confirmDelete")}
          confirmLabel={t("form.delete")}
          cancelLabel={t("form.cancel")}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      </section>
    );
  }

  // TODO: load user template changes too (loadEffectiveTemplate) when templates become editable.
  const template = buildEffectiveTemplate(codeTemplateFor(record.template), {});

  return (
    <section className="screen">
      <button type="button" className="link-button back-button" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden /> {t("libraries.title")}
      </button>

      <header className="record-header">
        <p className="label">{t(`types.${record.template}`)}</p>
        <div className="record-title-row">
          <h1>{record.title}</h1>
          <button type="button" className="button" onClick={() => setEditing(true)}>
            <Pencil size={14} aria-hidden /> {t("record.edit")}
          </button>
        </div>
        {record.original_title && <p className="screen-placeholder">{record.original_title}</p>}
        <div className="record-inline-edits">
          <StatusSelect templateId={record.template} value={record.status} onChange={(status) => change({ status })} />
          <RatingSelect value={record.rating} onChange={(rating) => change({ rating })} />
        </div>
      </header>

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

      {record.notes && <p className="record-notes">{record.notes}</p>}

      <HistoryList recordId={record.id} version={version} />
    </section>
  );
}
