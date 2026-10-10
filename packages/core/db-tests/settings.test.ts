import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createDatabase } from "../src/db/client";
import type { DataContext } from "../src/data/context";
import { loadSettings, saveSetting } from "../src/data/settings";
import { SETTING_DEFAULTS } from "../src/settings";
import { nodeBatchExecutor, nodeExecutor, openTestDatabase } from "./nodeSqlite";

let sqlite: DatabaseSync;
let ctx: DataContext;

beforeEach(() => {
  sqlite = openTestDatabase();
  ctx = { db: createDatabase(nodeExecutor(sqlite), nodeBatchExecutor(sqlite)), newId: () => "x", now: () => 1000 };
});

describe("settings", () => {
  it("returns the defaults when nothing is stored", async () => {
    expect(await loadSettings(ctx)).toEqual(SETTING_DEFAULTS);
  });

  it("stores and replaces values", async () => {
    await saveSetting(ctx, "theme.mode", "dark");
    await saveSetting(ctx, "theme.mode", "light");
    await saveSetting(ctx, "rating_display.movie", "out_of_10");

    expect(await loadSettings(ctx)).toEqual({ ...SETTING_DEFAULTS, "theme.mode": "light", "rating_display.movie": "out_of_10" });
    expect(sqlite.prepare("SELECT count(*) n FROM settings").get()).toEqual({ n: 2 });
  });

  it("ignores broken or unknown stored values", async () => {
    sqlite.exec(`INSERT INTO settings (key, value, updated_at) VALUES ('theme.mode', '"sepia"', 1), ('old.key', '1', 1)`);
    expect(await loadSettings(ctx)).toEqual(SETTING_DEFAULTS);
  });

  it("refuses to store an invalid value", async () => {
    // @ts-expect-error -- "sepia" is not a theme mode
    await expect(saveSetting(ctx, "theme.mode", "sepia")).rejects.toThrow();
  });
});
