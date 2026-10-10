import { and, eq, isNull } from "drizzle-orm";
import type { Timestamp, Uuid } from "../common";
import { recordImages, records } from "../db/schema";
import type { RecordImage } from "../record";
import type { DataContext } from "./context";

/**
 * A stored image path must be relative to the images folder, with forward slashes:
 * "covers/3f2b….jpg". Absolute paths, drive letters and ".." are rejected.
 */
export function isRelativeImagePath(path: string): boolean {
  return (
    path.length > 0 &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !path.includes(":") &&
    !path.split("/").includes("..")
  );
}

/** Builds the row for a new cover. Callers write it in the same batch as the record change. */
export function coverRow(ctx: DataContext, recordId: Uuid, path: string, at: Timestamp): RecordImage {
  return {
    id: ctx.newId(),
    record_id: recordId,
    kind: "cover",
    path,
    caption: null,
    position: 0,
    created_at: at,
    updated_at: at,
    deleted_at: null,
  };
}

/** The live cover's relative path, or null when the record has none. */
export async function getCover(ctx: DataContext, recordId: Uuid): Promise<string | null> {
  const row = await ctx.db
    .select({ path: recordImages.path })
    .from(recordImages)
    .where(
      and(eq(recordImages.record_id, recordId), eq(recordImages.kind, "cover"), isNull(recordImages.deleted_at)),
    )
    .get();
  return row?.path ?? null;
}

/** Cover paths of every live record, by record id: one query for a whole library. */
export async function listCovers(ctx: DataContext): Promise<Map<Uuid, string>> {
  const rows = await ctx.db
    .select({ recordId: recordImages.record_id, path: recordImages.path })
    .from(recordImages)
    .innerJoin(records, eq(records.id, recordImages.record_id))
    .where(and(eq(recordImages.kind, "cover"), isNull(recordImages.deleted_at), isNull(records.deleted_at)));
  return new Map(rows.map((r) => [r.recordId, r.path]));
}
