import type { MediaRecord } from "@remedia/core";
import { useProgress } from "../progress";
import { useFormatRating } from "../settings/SettingsContext";
import { Cover } from "./Cover";
import { ProgressBar } from "./ProgressBar";
import "./RecordCard.css";

/** Date fields that hold each type's release, in order of preference. */
const DATE_FIELDS = ["release_date", "first_air_date", "publication_date", "air_date"];

/** Year from a partial ISO date ("2016-11-11" -> "2016"), if the record has one. */
export function releaseYear(record: MediaRecord): string | null {
  for (const key of DATE_FIELDS) {
    const date = record.fields[key];
    if (typeof date === "string") return date.slice(0, 4);
  }
  return null;
}

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
  const year = releaseYear(record);
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
