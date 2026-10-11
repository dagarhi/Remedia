import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Timestamp, Uuid } from "../common";
import { externalLinks, records } from "../db/schema";
import type { ExternalLink } from "../record";
import type { DataContext } from "./context";

export interface LinkInput {
  provider: string;
  external_id: string;
}

export function linkRows(ctx: DataContext, recordId: Uuid, links: LinkInput[], at: Timestamp): ExternalLink[] {
  const seen = new Set<string>();
  return links
    .filter((l) => {
      const key = `${l.provider}\u0000${l.external_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((l) => ({
      id: ctx.newId(),
      record_id: recordId,
      provider: l.provider,
      external_id: l.external_id,
      created_at: at,
      updated_at: at,
      deleted_at: null,
    }));
}

/** The live record already linked to any of these provider items, if there is one (data model, duplicates). */
export async function findLinkedRecord(ctx: DataContext, links: LinkInput[]): Promise<Uuid | undefined> {
  for (const link of links) {
    const row = await ctx.db
      .select({ id: records.id })
      .from(externalLinks)
      .innerJoin(records, eq(records.id, externalLinks.record_id))
      .where(
        and(
          eq(externalLinks.provider, link.provider),
          eq(externalLinks.external_id, link.external_id),
          isNull(externalLinks.deleted_at),
          isNull(records.deleted_at),
        ),
      )
      .get();
    if (row) return row.id;
  }
  return undefined;
}

/**
 * Which of these external ids (for one provider) are already in the library, mapped to the
 * record id: search results show "Already in your library" for them.
 */
export async function linkedExternalIds(ctx: DataContext, provider: string, ids: string[]): Promise<Map<string, Uuid>> {
  if (ids.length === 0) return new Map();
  const rows = await ctx.db
    .select({ externalId: externalLinks.external_id, recordId: records.id })
    .from(externalLinks)
    .innerJoin(records, eq(records.id, externalLinks.record_id))
    .where(
      and(
        eq(externalLinks.provider, provider),
        inArray(externalLinks.external_id, ids),
        isNull(externalLinks.deleted_at),
        isNull(records.deleted_at),
      ),
    );
  return new Map(rows.map((r) => [r.externalId, r.recordId]));
}

/** A record's live external links. */
export async function listLinks(ctx: DataContext, recordId: Uuid): Promise<ExternalLink[]> {
  return ctx.db
    .select()
    .from(externalLinks)
    .where(and(eq(externalLinks.record_id, recordId), isNull(externalLinks.deleted_at)));
}
