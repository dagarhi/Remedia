import type { MediaRecord } from "@remedia/core";
import { iconForType } from "../recordTypes";
import "./RecordCard.css";

/** Year from a partial ISO date ("2016-11-11" -> "2016"), if the record has one. */
function releaseYear(record: MediaRecord): string | null {
  const date = record.fields.release_date;
  return typeof date === "string" ? date.slice(0, 4) : null;
}

interface RecordCardProps {
  record: MediaRecord;
  onOpen: (record: MediaRecord) => void;
}

/** A poster with title and year, as shelves and grids show records. */
export function RecordCard({ record, onOpen }: RecordCardProps) {
  const Icon = iconForType(record.template);
  const year = releaseYear(record);

  return (
    <button type="button" className="record-card" onClick={() => onOpen(record)}>
      {/* Covers come with images (roadmap step 5); until then, the type icon. */}
      <span className="record-card-cover" aria-hidden>
        <Icon size={36} />
      </span>
      <span className="record-card-title">{record.title}</span>
      {year && <span className="record-card-year">{year}</span>}
    </button>
  );
}
