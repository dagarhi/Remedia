import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import { addNote, deleteHistoryEntry, listHistory, updateNote, type HistoryEntry, type Uuid } from "@remedia/core";
import { data } from "../db/database";
import { useFormatRating } from "../settings/SettingsContext";
import "./HistoryList.css";
import { ConfirmDialog } from "./ConfirmDialog";

interface HistoryListProps {
  recordId: Uuid;
  /** The record's type, to show ratings on its display scale. */
  templateId: string;
  /** Changes whenever the record page saves something, so the list reloads. */
  version: number;
}

/** A record's history, newest first: the user's notes plus status and rating events. */
export function HistoryList({ recordId, templateId, version }: HistoryListProps) {
  const { t, i18n } = useTranslation();
  const formatRating = useFormatRating();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: Uuid; text: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<{ entry: HistoryEntry } | null>(null);

  const reload = () => listHistory(data, recordId).then(setEntries);

  useEffect(() => {
    reload();
  }, [recordId, version]);

  // The oldest status line is the one created with the record: "Added to", not "Moved to".
  const firstStatusId = [...entries].reverse().find((e) => e.kind === "status")?.id;

  /** Events store the fact; the sentence is built here, in the current language and scale. */
  function sentence(entry: HistoryEntry): string {
    switch (entry.kind) {
      case "note":
        return entry.text ?? "";
      case "status": {
        const library = t(`libraries.${entry.status}`);
        return t(entry.id === firstStatusId ? "history.added" : "history.moved", { library });
      }
      case "rating":
        return entry.rating === null ? t("history.ratingRemoved") : t("history.rated", { stars: formatRating(entry.rating, templateId) });
    }
  }

  const date = (ms: number) => new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(ms);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (draft.trim() === "") return;
    await addNote(data, recordId, draft);
    setDraft("");
    reload();
  }

  async function handleSaveEdit() {
    if (!editing || editing.text.trim() === "") return;
    await updateNote(data, editing.id, editing.text);
    setEditing(null);
    reload();
  }

  async function handleDelete(entry: HistoryEntry) {
    await deleteHistoryEntry(data, entry.id);
    setConfirmingDelete(null);
    reload();
  }

  return (
    <section className="history">
      <h2>{t("history.title")}</h2>

      <form className="history-add" onSubmit={handleAdd}>
        <textarea
          rows={2}
          value={draft}
          placeholder={t("history.notePlaceholder")}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="button button--primary" disabled={draft.trim() === ""}>
          {t("history.addNote")}
        </button>
      </form>

      {entries.length === 0 ? (
        <p className="screen-placeholder">{t("history.empty")}</p>
      ) : (
        <ol className="history-list">
          {entries.map((entry) => (
            <li key={entry.id} className={entry.kind === "note" ? "history-line" : "history-line history-line--event"}>
              <time className="history-date">{date(entry.created_at)}</time>

              {editing?.id === entry.id ? (
                <div className="history-edit">
                  <textarea
                    rows={2}
                    value={editing.text}
                    autoFocus
                    onChange={(e) => setEditing({ id: entry.id, text: e.target.value })}
                  />
                  <div className="history-edit-actions">
                    <button type="button" className="button" onClick={() => setEditing(null)}>
                      {t("form.cancel")}
                    </button>
                    <button type="button" className="button button--primary" onClick={handleSaveEdit}>
                      {t("form.save")}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="history-text">{sentence(entry)}</p>
              )}

              <span className="history-actions">
                {/* Notes can be edited; events can only be deleted. */}
                {entry.kind === "note" && editing?.id !== entry.id && (
                  <button
                    type="button"
                    className="icon-button"
                    title={t("history.edit")}
                    aria-label={t("history.edit")}
                    onClick={() => setEditing({ id: entry.id, text: entry.text ?? "" })}
                  >
                    <Pencil size={14} aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  className="icon-button"
                  title={t("history.delete")}
                  aria-label={t("history.delete")}
                  onClick={() => 
                    setConfirmingDelete({ entry })
                  }
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ol>
        
      )}
      <ConfirmDialog
        open={confirmingDelete !== null}
        title={t("history.deleteTitle")}
        message={t("history.confirmDelete")}
        confirmLabel={t("form.delete")}
        cancelLabel={t("form.cancel")}
        onConfirm={() => handleDelete(confirmingDelete!.entry)}
        onCancel={() => {
          setConfirmingDelete(null);
        }}
      />
    </section>
  );
}
