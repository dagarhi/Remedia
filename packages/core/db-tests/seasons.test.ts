import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createDatabase } from "../src/db/client";
import { DataValidationError, type DataContext } from "../src/data/context";
import { createRecord, deleteRecord, getRecord, listChildren, listChildrenByParent, listRecords, updateRecord } from "../src/data/records";
import { nodeBatchExecutor, nodeExecutor, openTestDatabase } from "./nodeSqlite";

let sqlite: DatabaseSync;
let ctx: DataContext;

beforeEach(() => {
  sqlite = openTestDatabase();
  let n = 0;
  ctx = {
    db: createDatabase(nodeExecutor(sqlite), nodeBatchExecutor(sqlite)),
    newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
    now: () => 1000,
  };
});

const season = (parent: string, n: number, extra = {}) =>
  createRecord(ctx, { template: "season", parent_id: parent, title: `Season ${n}`, fields: { season_number: n, ...extra } });

async function issues(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(DataValidationError);
  return (error as DataValidationError).issues;
}

describe("seasons", () => {
  it("are created under a series, listed by number and kept out of the libraries", async () => {
    const severance = await createRecord(ctx, { template: "series", title: "Severance" });
    await season(severance.id, 2);
    await season(severance.id, 1);

    expect((await listChildren(ctx, severance.id)).map((s) => s.fields.season_number)).toEqual([1, 2]);
    expect((await listRecords(ctx)).map((r) => r.title)).toEqual(["Severance"]);
    expect((await listChildrenByParent(ctx)).get(severance.id)).toHaveLength(2);
  });

  it("need a series as parent", async () => {
    const movie = await createRecord(ctx, { template: "movie", title: "Dune" });
    expect(await issues(season(movie.id, 1))).toEqual([{ path: "parent_id", code: "required" }]);
    expect(await issues(createRecord(ctx, { template: "season", title: "S1", fields: { season_number: 1 } }))).toEqual([
      { path: "parent_id", code: "required" },
    ]);
  });

  it("reject a season number already used in the same series", async () => {
    const severance = await createRecord(ctx, { template: "series", title: "Severance" });
    const first = await season(severance.id, 1);
    expect(await issues(season(severance.id, 1))).toEqual([{ path: "fields.season_number", code: "duplicate" }]);
    // Editing a season keeps its own number without clashing with itself.
    await expect(updateRecord(ctx, first.id, { fields: { season_number: 1, episodes_watched: 3 } })).resolves.toBeDefined();
  });

  it("only allow a parent on seasons", async () => {
    const severance = await createRecord(ctx, { template: "series", title: "Severance" });
    expect(await issues(createRecord(ctx, { template: "movie", title: "x", parent_id: severance.id }))).toEqual([
      { path: "parent_id", code: "not_allowed" },
    ]);
  });

  it("are deleted with their series", async () => {
    const severance = await createRecord(ctx, { template: "series", title: "Severance" });
    const s1 = await season(severance.id, 1);
    await deleteRecord(ctx, severance.id);
    expect(await getRecord(ctx, s1.id)).toBeUndefined();
  });
});

describe("new built-in types", () => {
  it.each(["book", "game", "anime", "manga", "series"])("can create a %s", async (template) => {
    await expect(createRecord(ctx, { template, title: "x" })).resolves.toMatchObject({ template });
  });
});
