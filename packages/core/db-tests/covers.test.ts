import type { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { createDatabase } from "../src/db/client";
import { DataValidationError, type DataContext } from "../src/data/context";
import { getCover, isRelativeImagePath, listCovers } from "../src/data/images";
import { createRecord, deleteRecord, updateRecord } from "../src/data/records";
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
    newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
    now: () => clock,
  };
});

const liveCovers = () =>
  sqlite.prepare("SELECT path FROM record_images WHERE kind = 'cover' AND deleted_at IS NULL").all();

describe("isRelativeImagePath", () => {
  it.each(["covers/a.jpg", "covers/sub/a.png"])("accepts %s", (path) => {
    expect(isRelativeImagePath(path)).toBe(true);
  });

  it.each(["", "/covers/a.jpg", "C:/a.jpg", "covers\\a.jpg", "covers/../../secret.jpg"])("rejects %s", (path) => {
    expect(isRelativeImagePath(path)).toBe(false);
  });
});

describe("covers", () => {
  it("saves the cover together with a new record", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune", cover: "covers/dune.jpg" });
    expect(await getCover(ctx, dune.id)).toBe("covers/dune.jpg");
  });

  it("creates a record without a cover", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune" });
    expect(await getCover(ctx, dune.id)).toBeNull();
  });

  it("replaces a cover, keeping only one live", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune", cover: "covers/old.jpg" });
    clock = 2000;
    await updateRecord(ctx, dune.id, { cover: "covers/new.jpg" });

    expect(await getCover(ctx, dune.id)).toBe("covers/new.jpg");
    expect(liveCovers()).toEqual([{ path: "covers/new.jpg" }]);
  });

  it("removes a cover with null and leaves it untouched when not given", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune", cover: "covers/dune.jpg" });
    await updateRecord(ctx, dune.id, { title: "Dune: Part One" });
    expect(await getCover(ctx, dune.id)).toBe("covers/dune.jpg");

    await updateRecord(ctx, dune.id, { cover: null });
    expect(await getCover(ctx, dune.id)).toBeNull();
  });

  it("rejects an absolute path and saves nothing", async () => {
    await expect(
      createRecord(ctx, { template: "movie", title: "Dune", cover: "C:/Users/me/dune.jpg" }),
    ).rejects.toBeInstanceOf(DataValidationError);
    expect(sqlite.prepare("SELECT count(*) n FROM records").get()).toEqual({ n: 0 });
  });

  it("lists the covers of live records only", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune", cover: "covers/dune.jpg" });
    const heat = await createRecord(ctx, { template: "movie", title: "Heat", cover: "covers/heat.jpg" });
    await deleteRecord(ctx, heat.id);

    expect(await listCovers(ctx)).toEqual(new Map([[dune.id, "covers/dune.jpg"]]));
  });
});
