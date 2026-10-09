import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { Uuid } from "../common";
import { externalLinks, historyEntries, recordImages, records, recordTags } from "../db/schema";
import { compactFields, validateFields } from "../fields";
import { isValidStoredRating } from "../rating";
import type { FieldValue, MediaRecord, RecordStatus } from "../record";
import { DataValidationError, type DataContext, type DataIssue } from "./context";
import { historyEvent } from "./history";
import { loadEffectiveTemplate } from "./templates";

/** What the add form provides. Optional values may be left out. */
export interface NewRecord {
  template: string;
  title: string;
  original_title?: string | null;
  status?: RecordStatus;
  /** Stored scale, 1-100 (convert from the display scale with `fromDisplayRating`). */
  rating?: number | null;
  notes?: string | null;
  /** Raw form values; empty ones are dropped before saving. */
  fields?: Record<string, FieldValue | null | undefined>;
}

/** What an edit may change. Only the given keys are updated; `null` clears a value. */
export type RecordChanges = Partial<Omit<NewRecord, "template">>;

/** Trims optional text; an empty string becomes null (empty values are not stored). */
function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

/** Checks a full record against its template. Throws DataValidationError listing every problem. */
async function validateRecord(ctx: DataContext, record: MediaRecord): Promise<void> {
  const issues: DataIssue[] = [];
  if (record.title.trim() === "") issues.push({ path: "title", code: "required" });
  if (record.rating !== null && !isValidStoredRating(record.rating)) {
    issues.push({ path: "rating", code: "out_of_range" });
  }

  const template = await loadEffectiveTemplate(ctx, record.template);
  if (!template) {
    issues.push({ path: "template", code: "unknown" });
  } else {
    for (const error of validateFields(record.fields, template)) {
      issues.push({ path: `fields.${error.key}`, code: error.code });
    }
  }

  if (issues.length > 0) throw new DataValidationError(issues);
}

/** Creates a top-level record (not a season). Returns the saved record. */
export async function createRecord(ctx: DataContext, input: NewRecord): Promise<MediaRecord> {
  const now = ctx.now();
  const record: MediaRecord = {
    id: ctx.newId(),
    template: input.template,
    parent_id: null,
    title: input.title.trim(),
    original_title: optionalText(input.original_title),
    status: input.status ?? "planned",
    rating: input.rating ?? null,
    notes: optionalText(input.notes),
    fields: compactFields(input.fields ?? {}),
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await validateRecord(ctx, record);

  // The record and its first history lines ("Added to Pending", "Rated ★★★★") are saved together.
  const events = [historyEvent(ctx, record.id, now, { kind: "status", status: record.status })];
  if (record.rating !== null) events.push(historyEvent(ctx, record.id, now, { kind: "rating", rating: record.rating }));
  await ctx.db.batch([ctx.db.insert(records).values(record), ctx.db.insert(historyEntries).values(events)]);
  return record;
}

/** A live (not deleted) record, or undefined. */
export async function getRecord(ctx: DataContext, id: Uuid): Promise<MediaRecord | undefined> {
  return ctx.db
    .select()
    .from(records)
    .where(and(eq(records.id, id), isNull(records.deleted_at)))
    .get();
}

export interface RecordFilter {
  status?: RecordStatus;
  template?: string;
}

/**
 * Live top-level records (seasons only appear inside their series), most recently
 * modified first, as the libraries show them.
 */
export async function listRecords(ctx: DataContext, filter: RecordFilter = {}): Promise<MediaRecord[]> {
  const conditions = [isNull(records.deleted_at), isNull(records.parent_id)];
  if (filter.status) conditions.push(eq(records.status, filter.status));
  if (filter.template) conditions.push(eq(records.template, filter.template));
  return ctx.db
    .select()
    .from(records)
    .where(and(...conditions))
    .orderBy(desc(records.updated_at));
}

/** Applies an edit and returns the updated record. Throws if the record does not exist. */
export async function updateRecord(ctx: DataContext, id: Uuid, changes: RecordChanges): Promise<MediaRecord> {
  const current = await getRecord(ctx, id);
  if (!current) throw new DataValidationError([{ path: "id", code: "not_found" }]);

  const updated: MediaRecord = {
    ...current,
    title: changes.title !== undefined ? changes.title.trim() : current.title,
    original_title: "original_title" in changes ? optionalText(changes.original_title) : current.original_title,
    status: changes.status ?? current.status,
    rating: "rating" in changes ? (changes.rating ?? null) : current.rating,
    notes: "notes" in changes ? optionalText(changes.notes) : current.notes,
    fields: changes.fields !== undefined ? compactFields(changes.fields) : current.fields,
    updated_at: ctx.now(),
  };
  await validateRecord(ctx, updated);

  // A status or rating change is also written to the history, in the same transaction.
  const events = [];
  if (updated.status !== current.status) {
    events.push(historyEvent(ctx, id, updated.updated_at, { kind: "status", status: updated.status }));
  }
  if (updated.rating !== current.rating) {
    events.push(historyEvent(ctx, id, updated.updated_at, { kind: "rating", rating: updated.rating }));
  }

  const { id: _id, created_at: _created, ...values } = updated;
  const updateRow = ctx.db.update(records).set(values).where(eq(records.id, id));
  if (events.length > 0) await ctx.db.batch([updateRow, ctx.db.insert(historyEntries).values(events)]);
  else await updateRow;
  return updated;
}

/**
 * Soft-deletes a record and everything that belongs to it (seasons and their children,
 * history, images, tag assignments, external links) in one transaction, all with the
 * same `deleted_at`. Tags themselves are global and stay.
 */
export async function deleteRecord(ctx: DataContext, id: Uuid): Promise<void> {
  const record = await getRecord(ctx, id);
  if (!record) return;

  const seasons = await ctx.db
    .select({ id: records.id })
    .from(records)
    .where(and(eq(records.parent_id, id), isNull(records.deleted_at)));
  const ids = [id, ...seasons.map((s) => s.id)];

  const deleted_at = ctx.now();
  const change = { deleted_at, updated_at: deleted_at };

  await ctx.db.batch([
    ctx.db.update(records).set(change).where(and(inArray(records.id, ids), isNull(records.deleted_at))),
    ctx.db.update(historyEntries).set(change).where(and(inArray(historyEntries.record_id, ids), isNull(historyEntries.deleted_at))),
    ctx.db.update(recordImages).set(change).where(and(inArray(recordImages.record_id, ids), isNull(recordImages.deleted_at))),
    ctx.db.update(recordTags).set(change).where(and(inArray(recordTags.record_id, ids), isNull(recordTags.deleted_at))),
    ctx.db.update(externalLinks).set(change).where(and(inArray(externalLinks.record_id, ids), isNull(externalLinks.deleted_at))),
  ]);
}
