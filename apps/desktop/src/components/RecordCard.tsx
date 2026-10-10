import type { MediaRecord } from "@remedia/core";
import { Cover } from "./Cover";
import "./RecordCard.css";
import { stars } from "./RatingSelect";

/** Year from a partial ISO date ("2016-11-11" -> "2016"), if the record has one. */
function releaseYear(record: MediaRecord): string | null {
  const date = record.fields.release_date;
  return typeof date === "string" ? date.slice(0, 4) : null;
}

interface RecordCardProps {
  record: MediaRecord;
  /** Relative path of its cover, if it has one. */
  cover?: string | null;
  onOpen: (record: MediaRecord) => void;
}

/** A poster with title and year, as shelves and grids show records. */
export function RecordCard({ record, cover, onOpen }: RecordCardProps) {
  const year = releaseYear(record);
  const rating = record.rating;

  return (
    <button type="button" className="record-card" onClick={() => onOpen(record)}>
      <Cover path={cover} templateId={record.template} className="record-card-cover" />
      <span className="record-card-title">{record.title}</span>
      {year && <span className="record-card-year">{year}</span>}
      {rating !== null && <span className="record-card-rating">{stars(rating)}</span>}
    </button>
  );
}
