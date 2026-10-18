import { useTranslation } from "react-i18next";
import { releaseDate, type MediaRecord } from "@remedia/core";
import { useProgress } from "../progress";
import { useFormatRating } from "../settings/SettingsContext";
import { Cover } from "./Cover";
import { ProgressBar } from "./ProgressBar";
import "./RecordRow.css";

interface RecordRowProps {
  record: MediaRecord;
  cover?: string | null;
  seasons?: MediaRecord[];
  onOpen: (record: MediaRecord) => void;
}

/** Compact list row (UI Design, library view): cover, title, type, year, progress, rating. */
export function RecordRow({ record, cover, seasons, onOpen }: RecordRowProps) {
  const { t } = useTranslation();
  const formatRating = useFormatRating();
  const progress = useProgress()(record, seasons);
  const year = releaseDate(record)?.slice(0, 4);

  return (
    <button type="button" className="record-row" onClick={() => onOpen(record)}>
      <Cover path={cover} templateId={record.template} iconSize={14} className="record-row-cover" />
      <span className="record-row-title">{record.title}</span>
      <span className="record-row-meta">{t(`types.${record.template}`)}</span>
      <span className="record-row-meta record-row-year">{year ?? ""}</span>
      <span className="record-row-progress">{progress && <ProgressBar progress={progress} />}</span>
      <span className="record-row-rating">{record.rating !== null ? formatRating(record.rating, record.template) : ""}</span>
    </button>
  );
}
