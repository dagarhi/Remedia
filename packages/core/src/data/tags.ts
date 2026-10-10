import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Timestamp, Uuid } from "../common";
import { records, recordTags, tags } from "../db/schema";
import { normalizeTagName, type Tag } from "../tag";
import type { DataContext } from "./context";

/** Tag names typed by the user: trimmed, empty ones dropped, duplicates (by normalized name) removed. */
export function cleanTagNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.trim().replace(/\s+/g, " ");
    const key = normalizeTagName(name);
    if (key === "" || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

/** A record's live tags, alphabetically. */
export async function listRecordTags(ctx: DataContext, recordId: Uuid): Promise<Tag[]> {
  const rows = await ctx.db
    .select({ tag: tags })
    .from(recordTags)
    .innerJoin(tags, eq(tags.id, recordTags.tag_id))
    .where(and(eq(recordTags.record_id, recordId), isNull(recordTags.deleted_at), isNull(tags.deleted_at)))
    .orderBy(asc(tags.normalized_name));
  return rows.map((r) => r.tag);
}

/**
 * Batch steps that make a record's tags exactly `names`: new tags are created, existing
 * ones reused (matched by normalized name, so "Favourites" and "favourites" are one tag),
 * removed assignments soft-deleted and re-added ones revived. Callers write the steps
 * in the same batch as the record change.
 */
export async function tagChanges(
  ctx: DataContext,
  recordId: Uuid,
  names: string[],
  at: Timestamp,
): Promise<BatchItem<"sqlite">[]> {
  const wanted = new Map(cleanTagNames(names).map((name) => [normalizeTagName(name), name]));
  const steps: BatchItem<"sqlite">[] = [];

  const liveTags = await ctx.db.select().from(tags).where(isNull(tags.deleted_at));
  const tagByKey = new Map(liveTags.map((t) => [t.normalized_name, t]));
  // Every assignment of this record, deleted ones too (they are revived, not duplicated).
  const assignments = await ctx.db.select().from(recordTags).where(eq(recordTags.record_id, recordId));
  const assignmentByTag = new Map(assignments.map((a) => [a.tag_id, a]));

  const wantedTagIds = new Set<Uuid>();
  for (const [key, name] of wanted) {
    let tag = tagByKey.get(key);
    if (!tag) {
      tag = { id: ctx.newId(), name, normalized_name: key, created_at: at, updated_at: at, deleted_at: null };
      steps.push(ctx.db.insert(tags).values(tag));
    }
    wantedTagIds.add(tag.id);

    const assignment = assignmentByTag.get(tag.id);
    if (!assignment) {
      steps.push(
        ctx.db
          .insert(recordTags)
          .values({ record_id: recordId, tag_id: tag.id, created_at: at, updated_at: at, deleted_at: null }),
      );
    } else if (assignment.deleted_at !== null) {
      steps.push(
        ctx.db
          .update(recordTags)
          .set({ deleted_at: null, updated_at: at })
          .where(and(eq(recordTags.record_id, recordId), eq(recordTags.tag_id, tag.id))),
      );
    }
  }

  for (const assignment of assignments) {
    if (assignment.deleted_at === null && !wantedTagIds.has(assignment.tag_id)) {
      steps.push(
        ctx.db
          .update(recordTags)
          .set({ deleted_at: at, updated_at: at })
          .where(and(eq(recordTags.record_id, recordId), eq(recordTags.tag_id, assignment.tag_id))),
      );
    }
  }
  return steps;
}

export interface TagSuggestion {
  tag: Tag;
  /** Live records of the given template using this tag. */
  uses: number;
}

/**
 * Tags to suggest while typing, as the data model says: tags already used on this type of
 * record first (most used first), then the other matching tags. `query` matches anywhere
 * in the name, ignoring case and accents; `exclude` skips tags the record already has.
 */
export async function suggestTags(
  ctx: DataContext,
  options: { template: string; query?: string; exclude?: string[]; limit?: number },
): Promise<TagSuggestion[]> {
  const usesForTemplate = sql<number>`coalesce(sum(case when ${records.template} = ${options.template} then 1 else 0 end), 0)`;
  const rows = await ctx.db
    .select({ tag: tags, uses: usesForTemplate, total: sql<number>`count(${records.id})` })
    .from(tags)
    .leftJoin(recordTags, and(eq(recordTags.tag_id, tags.id), isNull(recordTags.deleted_at)))
    .leftJoin(records, and(eq(records.id, recordTags.record_id), isNull(records.deleted_at)))
    .where(isNull(tags.deleted_at))
    .groupBy(tags.id);

  const query = normalizeTagName(options.query ?? "");
  const excluded = new Set((options.exclude ?? []).map(normalizeTagName));
  return rows
    .filter((r) => r.tag.normalized_name.includes(query) && !excluded.has(r.tag.normalized_name))
    .sort((a, b) => b.uses - a.uses || b.total - a.total || a.tag.normalized_name.localeCompare(b.tag.normalized_name))
    .slice(0, options.limit ?? 8)
    .map((r) => ({ tag: r.tag, uses: Number(r.uses) }));
}
