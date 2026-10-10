import { useTranslation } from "react-i18next";
import type { HistoryEntry } from "@remedia/core";
import { useFormatRating } from "../settings/SettingsContext";

/**
 * Builds the sentence for a history line. Events store the fact, never the text, so the
 * sentence always follows the current language and rating scale (data model, history_entries).
 */
export function useHistorySentence() {
  const { t } = useTranslation();
  const formatRating = useFormatRating();

  return (entry: HistoryEntry, firstStatus: boolean, templateId: string): string => {
    switch (entry.kind) {
      case "note":
        return entry.text ?? "";
      case "status":
        return t(firstStatus ? "history.added" : "history.moved", { library: t(`libraries.${entry.status}`) });
      case "rating":
        return entry.rating === null
          ? t("history.ratingRemoved")
          : t("history.rated", { stars: formatRating(entry.rating, templateId) });
    }
  };
}

/** Short date in the current language: "10 oct 2026" / "Oct 10, 2026". */
export function useShortDate() {
  const { i18n } = useTranslation();
  return (ms: number) => new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(ms);
}
