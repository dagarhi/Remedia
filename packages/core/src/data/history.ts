import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Timestamp, Uuid } from "../common";
import { historyEntries, records } from "../db/schema";
import type { HistoryEntry, RecordStatus } from "../record";
import { DataValidationError, type DataContext } from "./context";

type Event = { kind: "status"; status: RecordStatus } | { kind: "rating"; rating: number | null };

/** Builds the row for an automatic event. Callers write it in the same batch as the record change. */
export function historyEvent(ctx: DataContext, recordId: Uuid, at: Timestamp, event: Event): HistoryEntry {
  return {
    id: ctx.newId(),
    record_id: recordId,
    kind: event.kind,
    text: null,
    status: event.kind === "status" ? event.status : null,
    rating: event.kind === "rating" ? event.rating : null,
    created_at: at,
    updated_at: at,
    deleted_at: null,
  };
}

export interface RecentHistoryEntry {
  entry: HistoryEntry;
  record: { id: Uuid; title: string; template: string };
  /** True for the status line written when the record was created ("Added to…", not "Moved to…"). */
  firstStatus: boolean;
}

/** The latest history lines across all live records, newest first (Home's "Recent activity"). */
export async function listRecentHistory(ctx: DataContext, limit = 8): Promise<RecentHistoryEntry[]> {
  const rows = await ctx.db
    .select({
      entry: historyEntries,
      record: { id: records.id, title: records.title, template: records.template },
      // No earlier live status line for the same record means this one is the first.
      firstStatus: sql<number>`not exists (
        select 1 from history_entries earlier
        where earlier.record_id = ${historyEntries.record_id} and earlier.kind = 'status'
          and earlier.deleted_at is null and earlier.created_at < ${historyEntries.created_at})`,
    })
    .from(historyEntries)
    .innerJoin(records, eq(records.id, historyEntries.record_id))
    .where(and(isNull(historyEntries.deleted_at), isNull(records.deleted_at)))
    .orderBy(desc(historyEntries.created_at))
    .limit(limit);
  return rows.map((r) => ({ ...r, firstStatus: r.entry.kind === "status" && Boolean(r.firstStatus) }));
}

/** A record's live history, newest first. */
export async function listHistory(ctx: DataContext, recordId: Uuid): Promise<HistoryEntry[]> {
  return ctx.db
    .select()
    .from(historyEntries)
    .where(and(eq(historyEntries.record_id, recordId), isNull(historyEntries.deleted_at)))
    .orderBy(desc(historyEntries.created_at));
}

function noteText(text: string): string {
  const trimmed = text.trim();
  if (trimmed === "") throw new DataValidationError([{ path: "text", code: "required" }]);
  return trimmed;
}

/** Adds a note written by the user. */
export async function addNote(ctx: DataContext, recordId: Uuid, text: string): Promise<HistoryEntry> {
  const now = ctx.now();
  const entry: HistoryEntry = {
    id: ctx.newId(),
    record_id: recordId,
    kind: "note",
    text: noteText(text),
    status: null,
    rating: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await ctx.db.insert(historyEntries).values(entry);
  return entry;
}

/** Changes the text of a note. Events cannot be edited, only deleted. */
export async function updateNote(ctx: DataContext, entryId: Uuid, text: string): Promise<void> {
  const entry = await ctx.db
    .select()
    .from(historyEntries)
    .where(and(eq(historyEntries.id, entryId), isNull(historyEntries.deleted_at)))
    .get();
  if (!entry) throw new DataValidationError([{ path: "id", code: "not_found" }]);
  if (entry.kind !== "note") throw new DataValidationError([{ path: "kind", code: "not_editable" }]);

  await ctx.db
    .update(historyEntries)
    .set({ text: noteText(text), updated_at: ctx.now() })
    .where(eq(historyEntries.id, entryId));
}

/** Soft-deletes one history line (a note or an event added by mistake). */
export async function deleteHistoryEntry(ctx: DataContext, entryId: Uuid): Promise<void> {
  const now = ctx.now();
  await ctx.db
    .update(historyEntries)
    .set({ deleted_at: now, updated_at: now })
    .where(and(eq(historyEntries.id, entryId), isNull(historyEntries.deleted_at)));
}
