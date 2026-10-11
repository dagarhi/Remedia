import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createDatabase } from "../src/db/client";
import { DataValidationError, type DataContext } from "../src/data/context";
import { findLinkedRecord, linkedExternalIds, listLinks } from "../src/data/links";
import { createRecord, deleteRecord } from "../src/data/records";
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

const arrivalLinks = [
  { provider: "tmdb:movie", external_id: "329865" },
  { provider: "imdb", external_id: "tt2543164" },
];

describe("external links", () => {
  it("are saved with the record", async () => {
    const arrival = await createRecord(ctx, { template: "movie", title: "Arrival", links: arrivalLinks });
    expect((await listLinks(ctx, arrival.id)).map((l) => [l.provider, l.external_id])).toEqual([
      ["tmdb:movie", "329865"],
      ["imdb", "tt2543164"],
    ]);
  });

  it("find the record that already has an item, by any of its ids", async () => {
    const arrival = await createRecord(ctx, { template: "movie", title: "Arrival", links: arrivalLinks });
    expect(await findLinkedRecord(ctx, [{ provider: "imdb", external_id: "tt2543164" }])).toBe(arrival.id);
    expect(await linkedExternalIds(ctx, "tmdb:movie", ["329865", "1"])).toEqual(new Map([["329865", arrival.id]]));
  });

  it("refuse adding the same item twice, but allow it again after deleting", async () => {
    const arrival = await createRecord(ctx, { template: "movie", title: "Arrival", links: arrivalLinks });
    const error = await createRecord(ctx, { template: "movie", title: "Arrival", links: arrivalLinks }).catch((e) => e);
    expect(error).toBeInstanceOf(DataValidationError);
    expect(error.issues).toEqual([{ path: "links", code: "already_in_library" }]);

    await deleteRecord(ctx, arrival.id);
    await expect(createRecord(ctx, { template: "movie", title: "Arrival", links: arrivalLinks })).resolves.toBeDefined();
  });
});
