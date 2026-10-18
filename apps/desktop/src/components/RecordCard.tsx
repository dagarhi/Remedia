import { releaseDate, type MediaRecord } from "@remedia/core";
import { useProgress } from "../progress";
import { useFormatRating } from "../settings/SettingsContext";
import { Cover } from "./Cover";
import { ProgressBar } from "./ProgressBar";
import "./RecordCard.css";

interface RecordCardProps {
  record: MediaRecord;
  /** Relative path of its cover, if it has one. */
  cover?: string | null;
  /** Series only: their seasons, to compute progress. */
  seasons?: MediaRecord[];
  onOpen: (record: MediaRecord) => void;
}

/** A poster with title, year, rating and progress, as shelves and grids show records. */
export function RecordCard({ record, cover, seasons, onOpen }: RecordCardProps) {
  const year = releaseDate(record)?.slice(0, 4);
  const rating = record.rating;
  const formatRating = useFormatRating();
  const progress = useProgress()(record, seasons);

  return (
    <button type="button" className="record-card" onClick={() => onOpen(record)}>
      <Cover path={cover} templateId={record.template} className="record-card-cover" />
      <span className="record-card-title">{record.title}</span>
      {year && <span className="record-card-year">{year}</span>}
      {rating !== null && <span className="record-card-rating">{formatRating(rating, record.template)}</span>}
      {progress && <ProgressBar progress={progress} />}
    </button>
  );
}
