import { useEffect, useState } from "react";
import { listRecords, type MediaRecord, type RecordFilter } from "@remedia/core";
import { data } from "./db/database";

/**
 * Loads live records when the component appears (or the filter changes).
 * Returns undefined while loading. A custom hook: a function starting with `use`
 * that bundles state and effects so several screens can share them.
 */
export function useRecords(filter: RecordFilter = {}): MediaRecord[] | undefined {
  const [records, setRecords] = useState<MediaRecord[] | undefined>(undefined);
  const { status, template } = filter;

  useEffect(() => {
    let cancelled = false;
    listRecords(data, { status, template }).then((rows) => {
      // Ignore a slow answer that arrives after the screen changed.
      if (!cancelled) setRecords(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [status, template]);

  return records;
}
