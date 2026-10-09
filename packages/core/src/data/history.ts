import { and, desc, eq, isNull } from "drizzle-orm";
import type { Timestamp, Uuid } from "../common";
import { historyEntries } from "../db/schema";
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
