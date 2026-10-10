import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listRecentHistory, type RecentHistoryEntry, type Uuid } from "@remedia/core";
import { useHistorySentence, useShortDate } from "../components/historySentence";
import { data } from "../db/database";

/** "Recent activity": the latest history lines across all records. */
export function RecentActivityBlock({ onOpenRecord }: { onOpenRecord: (id: Uuid) => void }) {
  const { t } = useTranslation();
  const sentence = useHistorySentence();
  const date = useShortDate();
  const [lines, setLines] = useState<RecentHistoryEntry[] | null>(null);

  useEffect(() => {
    listRecentHistory(data, 8).then(setLines);
  }, []);

  if (!lines) return null;
  if (lines.length === 0) return <p className="screen-placeholder">{t("home.recentActivity.empty")}</p>;

  return (
    <ol className="activity-list">
      {lines.map(({ entry, record, firstStatus }) => (
        <li key={entry.id} className="activity-line">
          <time className="history-date">{date(entry.created_at)}</time>
          <button type="button" className="link-button activity-title" onClick={() => onOpenRecord(record.id)}>
            {record.title}
          </button>
          <span className={entry.kind === "note" ? "activity-text" : "activity-text activity-text--event"}>
            {sentence(entry, firstStatus, record.template)}
          </span>
        </li>
      ))}
    </ol>
  );
}
