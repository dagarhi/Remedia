import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createDatabase } from "../src/db/client";
import { DataValidationError, type DataContext } from "../src/data/context";
import { createRecord, deleteRecord, getRecord, listRecords, updateRecord } from "../src/data/records";
import { nodeBatchExecutor, nodeExecutor, openTestDatabase } from "./nodeSqlite";

let sqlite: DatabaseSync;
let ctx: DataContext;
let clock: number;

beforeEach(() => {
  sqlite = openTestDatabase();
  let n = 0;
  clock = 1000;
  ctx = {
    db: createDatabase(nodeExecutor(sqlite), nodeBatchExecutor(sqlite)),
    // Predictable ids and times make results easy to check.
    newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
    now: () => clock,
  };
});

const arrival = {
  template: "movie",
  title: "  Arrival ",
  fields: { release_date: "2016-11-11", director: ["Denis Villeneuve"], runtime: 116, synopsis: "" },
};

async function expectIssues(promise: Promise<unknown>, issues: { path: string; code: string }[]) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(DataValidationError);
  expect((error as DataValidationError).issues).toEqual(issues);
}

describe("createRecord", () => {
  it("saves a movie with defaults, trimmed text and empty fields dropped", async () => {
    const record = await createRecord(ctx, arrival);
    expect(record).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      template: "movie",
      parent_id: null,
      title: "Arrival",
      original_title: null,
      status: "planned",
      rating: null,
      notes: null,
      fields: { release_date: "2016-11-11", director: ["Denis Villeneuve"], runtime: 116 },
      created_at: 1000,
      updated_at: 1000,
      deleted_at: null,
    });
    expect(await getRecord(ctx, record.id)).toEqual(record);
  });

  it("lists every problem at once and saves nothing", async () => {
    await expectIssues(
      createRecord(ctx, { template: "movie", title: " ", rating: 0, fields: { runtime: "116 min" } }),
      [
        { path: "title", code: "required" },
        { path: "rating", code: "out_of_range" },
        { path: "fields.runtime", code: "wrong_type" },
      ],
    );
    expect(await listRecords(ctx)).toEqual([]);
  });

  it("rejects an unknown template", async () => {
    await expectIssues(createRecord(ctx, { template: "podcast", title: "x" }), [
      { path: "template", code: "unknown" },
    ]);
  });
});

describe("listRecords", () => {
  it("returns live records, newest change first, filtered by status", async () => {
    const a = await createRecord(ctx, { ...arrival, status: "completed" });
    clock = 2000;
    const b = await createRecord(ctx, { template: "movie", title: "Dune", status: "planned" });
    clock = 3000;
    const c = await createRecord(ctx, { template: "movie", title: "Heat", status: "completed" });

    expect((await listRecords(ctx)).map((r) => r.id)).toEqual([c.id, b.id, a.id]);
    expect((await listRecords(ctx, { status: "completed" })).map((r) => r.id)).toEqual([c.id, a.id]);
  });
});

describe("updateRecord", () => {
  it("changes only the given values and bumps updated_at", async () => {
    const record = await createRecord(ctx, { ...arrival, notes: "Rewatch" });
    clock = 5000;
    const updated = await updateRecord(ctx, record.id, { status: "completed", rating: 90, notes: null });

    expect(updated).toMatchObject({ title: "Arrival", status: "completed", rating: 90, notes: null, created_at: 1000, updated_at: 5000 });
    expect(await getRecord(ctx, record.id)).toEqual(updated);
  });

  it("validates before writing", async () => {
    const record = await createRecord(ctx, arrival);
    await expectIssues(updateRecord(ctx, record.id, { title: "" }), [{ path: "title", code: "required" }]);
    expect((await getRecord(ctx, record.id))?.title).toBe("Arrival");
  });

  it("fails for a missing record", async () => {
    await expectIssues(updateRecord(ctx, "00000000-0000-4000-8000-000000000999", { title: "x" }), [
      { path: "id", code: "not_found" },
    ]);
  });
});

describe("deleteRecord", () => {
  it("soft-deletes the record and its children with the same deleted_at", async () => {
    const record = await createRecord(ctx, arrival);
    sqlite.exec(`
      INSERT INTO history_entries (id, record_id, kind, text, created_at, updated_at)
        VALUES ('00000000-0000-4000-8000-0000000000a1', '${record.id}', 'note', 'Loved it', 1, 1);
      INSERT INTO external_links (id, record_id, provider, external_id, created_at, updated_at)
        VALUES ('00000000-0000-4000-8000-0000000000a2', '${record.id}', 'tmdb:movie', '329865', 1, 1);
      INSERT INTO tags (id, name, normalized_name, created_at, updated_at)
        VALUES ('00000000-0000-4000-8000-0000000000a3', 'Favs', 'favs', 1, 1);
      INSERT INTO record_tags (record_id, tag_id, created_at, updated_at)
        VALUES ('${record.id}', '00000000-0000-4000-8000-0000000000a3', 1, 1);
    `);

    clock = 9000;
    await deleteRecord(ctx, record.id);

    expect(await getRecord(ctx, record.id)).toBeUndefined();
    for (const table of ["records", "history_entries", "external_links", "record_tags"]) {
      expect(sqlite.prepare(`SELECT DISTINCT deleted_at FROM ${table}`).all(), table).toEqual([{ deleted_at: 9000 }]);
    }
    expect(sqlite.prepare("SELECT deleted_at FROM tags").get()).toEqual({ deleted_at: null });
  });

  it("lets the same external item be linked again after deleting", async () => {
    const first = await createRecord(ctx, arrival);
    const link = (id: string, recordId: string) =>
      sqlite.exec(`INSERT INTO external_links (id, record_id, provider, external_id, created_at, updated_at)
                   VALUES ('${id}', '${recordId}', 'tmdb:movie', '329865', 1, 1)`);
    link("00000000-0000-4000-8000-0000000000b1", first.id);
    await deleteRecord(ctx, first.id);

    const second = await createRecord(ctx, arrival);
    expect(() => link("00000000-0000-4000-8000-0000000000b2", second.id)).not.toThrow();
  });
});
