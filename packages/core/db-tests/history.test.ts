import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { createDatabase } from "../src/db/client";
import { DataValidationError, type DataContext } from "../src/data/context";
import { addNote, deleteHistoryEntry, listHistory, updateNote } from "../src/data/history";
import { createRecord, updateRecord } from "../src/data/records";
import { nodeBatchExecutor, nodeExecutor, openTestDatabase, runMigrations } from "./nodeSqlite";

let sqlite: DatabaseSync;
let ctx: DataContext;
let clock: number;

beforeEach(() => {
  sqlite = openTestDatabase();
  let n = 0;
  clock = 1000;
  ctx = {
    db: createDatabase(nodeExecutor(sqlite), nodeBatchExecutor(sqlite)),
    newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
    now: () => clock,
  };
});

/** Only the parts of each line that matter here, newest first. */
async function lines(recordId: string) {
  return (await listHistory(ctx, recordId)).map(({ kind, text, status, rating, created_at }) => ({
    kind,
    ...(kind === "note" ? { text } : kind === "status" ? { status } : { rating }),
    at: created_at,
  }));
}

describe("automatic events", () => {
  it("records the starting status when a record is created", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune" });
    expect(await lines(dune.id)).toEqual([{ kind: "status", status: "planned", at: 1000 }]);
  });

  it("also records the rating when a record is created with one", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune", status: "completed", rating: 80 });
    expect(await lines(dune.id)).toEqual(
      expect.arrayContaining([
        { kind: "status", status: "completed", at: 1000 },
        { kind: "rating", rating: 80, at: 1000 },
      ]),
    );
  });

  it("records status and rating changes, newest first", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune" });
    clock = 2000;
    await updateRecord(ctx, dune.id, { status: "completed" });
    clock = 3000;
    await updateRecord(ctx, dune.id, { rating: 80 });
    clock = 4000;
    await updateRecord(ctx, dune.id, { rating: null });

    expect(await lines(dune.id)).toEqual([
      { kind: "rating", rating: null, at: 4000 },
      { kind: "rating", rating: 80, at: 3000 },
      { kind: "status", status: "completed", at: 2000 },
      { kind: "status", status: "planned", at: 1000 },
    ]);
  });

  it("adds nothing when status and rating did not change", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune" });
    await updateRecord(ctx, dune.id, { status: "planned", notes: "Book first" });
    expect(await lines(dune.id)).toHaveLength(1);
  });
});

describe("notes", () => {
  it("adds, edits and deletes a note", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune" });
    clock = 2000;
    const note = await addNote(ctx, dune.id, "  Very interesting, might watch it again ");
    expect((await lines(dune.id))[0]).toEqual({ kind: "note", text: "Very interesting, might watch it again", at: 2000 });

    await updateNote(ctx, note.id, "Loved it");
    expect((await lines(dune.id))[0]).toMatchObject({ text: "Loved it" });

    await deleteHistoryEntry(ctx, note.id);
    expect(await lines(dune.id)).toHaveLength(1);
  });

  it("rejects an empty note", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune" });
    await expect(addNote(ctx, dune.id, "   ")).rejects.toBeInstanceOf(DataValidationError);
  });

  it("never edits an event, but can delete it", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune" });
    const [event] = await listHistory(ctx, dune.id);
    await expect(updateNote(ctx, event.id, "Hacked")).rejects.toBeInstanceOf(DataValidationError);

    await deleteHistoryEntry(ctx, event.id);
    expect(await lines(dune.id)).toEqual([]);
  });
});

describe("migration 0002", () => {
  it("keeps old entries as notes and adds a starting status line to existing records", () => {
    const old = new DatabaseSync(":memory:");
    old.exec("PRAGMA foreign_keys = ON");
    runMigrations(old, 1);
    old.exec(`
      INSERT INTO records (id, template, title, status, created_at, updated_at)
        VALUES ('00000000-0000-4000-8000-000000000001', 'movie', 'Arrival', 'completed', 500, 900);
      INSERT INTO history_entries (id, record_id, text, created_at, updated_at)
        VALUES ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'Loved it', 700, 700);
    `);

    runMigrations(old);

    const rows = old
      .prepare("SELECT id, kind, text, status, created_at FROM history_entries ORDER BY created_at")
      .all();
    expect(rows).toEqual([
      expect.objectContaining({ kind: "status", text: null, status: "completed", created_at: 500 }),
      { id: "00000000-0000-4000-8000-0000000000a1", kind: "note", text: "Loved it", status: null, created_at: 700 },
    ]);
    // The generated id is a lowercase UUID v4.
    expect(rows[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("rejects lines that mix kinds", () => {
    sqlite.exec(`INSERT INTO records (id, template, title, created_at, updated_at)
                 VALUES ('00000000-0000-4000-8000-000000000001', 'movie', 'Dune', 1, 1)`);
    const insert = (kind: string, text: string, status: string) =>
      sqlite.exec(`INSERT INTO history_entries (id, record_id, kind, text, status, created_at, updated_at)
                   VALUES ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000001',
                           '${kind}', ${text}, ${status}, 1, 1)`);
    expect(() => insert("note", "NULL", "NULL")).toThrow(/CHECK/);
    expect(() => insert("status", "'hi'", "'completed'")).toThrow(/CHECK/);
    expect(() => insert("status", "NULL", "NULL")).toThrow(/CHECK/);
  });
});
