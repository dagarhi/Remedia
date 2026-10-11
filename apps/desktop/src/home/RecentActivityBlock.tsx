import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { groupActivity, listRecentHistory, type ActivityItem, type Uuid } from "@remedia/core";
import { useHistorySentence, useShortDate } from "../components/historySentence";
import { data } from "../db/database";

/** How many lines the block shows, after grouping. */
const VISIBLE_ITEMS = 8;

/** "Recent activity": the latest history lines across all records, grouping repeated season events. */
export function RecentActivityBlock({ onOpenRecord }: { onOpenRecord: (id: Uuid) => void }) {
  const { t } = useTranslation();
  const sentence = useHistorySentence();
  const date = useShortDate();
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    // Read more lines than shown, so a group of seasons does not use up the whole block.
    listRecentHistory(data, 60).then((lines) => setItems(groupActivity(lines).slice(0, VISIBLE_ITEMS)));
  }, []);

  if (!items) return null;
  if (items.length === 0) return <p className="screen-placeholder">{t("home.recentActivity.empty")}</p>;

  return (
    <ol className="activity-list">
      {items.map((item) => {
        // A group reads like its first line; it names the series and how many seasons.
        const first = item.kind === "group" ? item.lines[0] : item.line;
        const target = item.kind === "group" ? item.parent.id : first.record.id;
        const title =
          item.kind === "group"
            ? `${item.parent.title} · ${t("home.recentActivity.seasons", { count: item.lines.length })}`
            : first.parent
              ? `${first.parent.title} · ${first.record.title}`
              : first.record.title;

        return (
          <li key={first.entry.id} className="activity-line">
            <time className="history-date">{date(first.entry.created_at)}</time>
            <button type="button" className="link-button activity-title" onClick={() => onOpenRecord(target)}>
              {title}
            </button>
            <span className={first.entry.kind === "note" ? "activity-text" : "activity-text activity-text--event"}>
              {sentence(first.entry, first.firstStatus, first.record.template)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
