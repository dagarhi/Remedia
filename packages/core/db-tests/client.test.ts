import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDatabase } from "../src/db/client";
import { historyEntries, records } from "../src/db/schema";
import type { MediaRecord } from "../src/record";
import { nodeBatchExecutor, nodeExecutor, openTestDatabase } from "./nodeSqlite";

const ID = "3f2b8c1e-1d2c-4b5a-9e8f-0a1b2c3d4e5f";

const arrival: MediaRecord = {
  id: ID,
  template: "movie",
  parent_id: null,
  title: "Arrival",
  original_title: null,
  status: "completed",
  rating: 90,
  notes: null,
  fields: { director: ["Denis Villeneuve"], runtime: 116, owned: false },
  created_at: 1,
  updated_at: 1,
  deleted_at: null,
};

function setup() {
  const sqlite = openTestDatabase();
  return { sqlite, db: createDatabase(nodeExecutor(sqlite), nodeBatchExecutor(sqlite)) };
}

describe("createDatabase", () => {
  it("round-trips a record, including JSON fields", async () => {
    const { db } = setup();
    await db.insert(records).values(arrival);
    const rows: MediaRecord[] = await db.select().from(records);
    expect(rows).toEqual([arrival]);
  });

  it("returns one row with get, or undefined", async () => {
    const { db } = setup();
    await db.insert(records).values(arrival);
    expect(await db.select().from(records).where(eq(records.id, ID)).get()).toEqual(arrival);
    expect(await db.select().from(records).where(eq(records.id, "missing")).get()).toBeUndefined();
  });

  it("updates rows", async () => {
    const { db } = setup();
    await db.insert(records).values(arrival);
    await db.update(records).set({ status: "planned", updated_at: 2 }).where(eq(records.id, ID));
    expect((await db.select().from(records).get())?.status).toBe("planned");
  });

  it("applies a batch atomically: one failure rolls everything back", async () => {
    const { db } = setup();
    await expect(
      db.batch([
        db.insert(records).values(arrival),
        db.insert(historyEntries).values({
          id: "not-a-uuid",
          record_id: ID,
          kind: "note",
          text: "Loved it",
          status: null,
          rating: null,
          created_at: 1,
          updated_at: 1,
          deleted_at: null,
        }),
      ]),
    ).rejects.toThrow();
    expect(await db.select().from(records)).toEqual([]);
  });
});
