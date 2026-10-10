import type { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { createDatabase } from "../src/db/client";
import type { DataContext } from "../src/data/context";
import { createRecord, deleteRecord, updateRecord } from "../src/data/records";
import { cleanTagNames, countTags, listRecordTags, suggestTags } from "../src/data/tags";
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
  // A custom template to check suggestions across types.
  sqlite.exec("INSERT INTO templates (id, name, created_at, updated_at) VALUES ('00000000-0000-4000-8000-0000000000ff', 'Board game', 0, 0)");
});

const names = async (recordId: string) => (await listRecordTags(ctx, recordId)).map((t) => t.name);

describe("cleanTagNames", () => {
  it("trims, drops empty ones and removes duplicates by normalized name", () => {
    expect(cleanTagNames([" Favoritos ", "favoritos", "", "  ", "Ciencia  ficción", "ciencia ficcion"])).toEqual([
      "Favoritos",
      "Ciencia ficción",
    ]);
  });
});

describe("record tags", () => {
  it("creates tags with the record", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune", tags: ["Favoritos", "Sci-fi"] });
    expect(await names(dune.id)).toEqual(["Favoritos", "Sci-fi"]);
  });

  it("reuses an existing tag regardless of case and accents", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune", tags: ["Favoritos"] });
    const heat = await createRecord(ctx, { template: "movie", title: "Heat", tags: ["FAVORÍTOS"] });

    expect(sqlite.prepare("SELECT count(*) n FROM tags").get()).toEqual({ n: 1 });
    // The tag keeps the name it was first typed with.
    expect(await names(heat.id)).toEqual(["Favoritos"]);
    expect(await names(dune.id)).toEqual(["Favoritos"]);
  });

  it("replaces the tag set on edit, reviving removed ones instead of duplicating", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune", tags: ["Favoritos", "Sci-fi"] });
    await updateRecord(ctx, dune.id, { tags: ["Sci-fi"] });
    expect(await names(dune.id)).toEqual(["Sci-fi"]);

    await updateRecord(ctx, dune.id, { tags: ["Sci-fi", "favoritos"] });
    expect(await names(dune.id)).toEqual(["Favoritos", "Sci-fi"]);
    expect(sqlite.prepare("SELECT count(*) n FROM record_tags").get()).toEqual({ n: 2 });
  });

  it("counts live tags", async () => {
    expect(await countTags(ctx)).toBe(0);
    await createRecord(ctx, { template: "movie", title: "Dune", tags: ["Favoritos", "Sci-fi"] });
    expect(await countTags(ctx)).toBe(2);
  });

  it("leaves tags untouched when an edit does not mention them", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune", tags: ["Favoritos"] });
    await updateRecord(ctx, dune.id, { title: "Dune: Part One" });
    expect(await names(dune.id)).toEqual(["Favoritos"]);
  });
});

describe("suggestTags", () => {
  const BOARD = "00000000-0000-4000-8000-0000000000ff";

  it("ranks tags used on the same type first, by count, then the rest", async () => {
    await createRecord(ctx, { template: "movie", title: "Dune", tags: ["Sci-fi", "Rewatch"] });
    await createRecord(ctx, { template: "movie", title: "Alien", tags: ["Sci-fi"] });
    await createRecord(ctx, { template: BOARD, title: "Catan", tags: ["Family", "Family night"] });

    const forMovies = await suggestTags(ctx, { template: "movie" });
    expect(forMovies.map((s) => [s.tag.name, s.uses])).toEqual([
      ["Sci-fi", 2],
      ["Rewatch", 1],
      ["Family", 0],
      ["Family night", 0],
    ]);
  });

  it("filters by what is typed, ignoring accents, and skips tags already on the record", async () => {
    await createRecord(ctx, { template: "movie", title: "Dune", tags: ["Ciencia ficción", "Clásico", "Favoritos"] });

    const result = await suggestTags(ctx, { template: "movie", query: "CI", exclude: ["clásico"] });
    expect(result.map((s) => s.tag.name)).toEqual(["Ciencia ficción"]);
  });

  it("does not count deleted records", async () => {
    const dune = await createRecord(ctx, { template: "movie", title: "Dune", tags: ["Sci-fi"] });
    await deleteRecord(ctx, dune.id);
    expect((await suggestTags(ctx, { template: "movie" }))[0].uses).toBe(0);
  });
});
