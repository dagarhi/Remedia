import { getTableConfig, type SQLiteTable } from "drizzle-orm/sqlite-core";
import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import * as schema from "../src/db/schema";
import { openTestDatabase } from "./nodeSqlite";

const ID = "3f2b8c1e-1d2c-4b5a-9e8f-0a1b2c3d4e5f";
const ID2 = "4a3c9d2f-2e3d-4c6b-8f90-1b2c3d4e5f60";

let db: DatabaseSync;

beforeEach(() => {
  db = openTestDatabase();
});

/** Inserts a minimal movie record, optionally with one extra column set to a raw SQL value. */
function insertRecord(id = ID, column?: string, sqlValue?: string) {
  const extraColumn = column ? `, ${column}` : "";
  const extraValue = column ? `, ${sqlValue}` : "";
  db.exec(
    `INSERT INTO records (id, template, title, created_at, updated_at${extraColumn})
     VALUES ('${id}', 'movie', 'Arrival', 1, 1${extraValue})`,
  );
}

describe("migration 0001", () => {
  it("creates the built-in template rows", () => {
    const ids = db.prepare("SELECT id FROM templates ORDER BY id").all().map((r) => r.id);
    expect(ids).toEqual(["book", "game", "movie", "season", "series"]);
  });

  it("matches the Drizzle schema column by column", () => {
    for (const table of Object.values(schema) as SQLiteTable[]) {
      const config = getTableConfig(table);
      const sqlColumns = db.prepare(`PRAGMA table_info(${config.name})`).all().map((c) => c.name);
      expect(config.columns.map((c) => c.name).sort(), config.name).toEqual([...sqlColumns].sort());
    }
  });

  it("applies defaults", () => {
    insertRecord();
    expect(db.prepare("SELECT status, fields FROM records").get()).toEqual({ status: "planned", fields: "{}" });
  });

  it.each([
    ["a non-UUID id", () => insertRecord("not-a-uuid")],
    ["an uppercase id", () => insertRecord(ID.toUpperCase())],
    ["an unknown status", () => insertRecord(ID, "status", "'watching'")],
    ["a rating of 0", () => insertRecord(ID, "rating", "0")],
    ["a rating that is not a number (STRICT)", () => insertRecord(ID, "rating", "'five'")],
    ["invalid JSON in fields", () => insertRecord(ID, "fields", "'{nope'")],
  ])("rejects %s", (_, insert) => {
    expect(insert).toThrow();
  });

  it("enforces foreign keys", () => {
    expect(() =>
      db.exec(`INSERT INTO records (id, template, title, created_at, updated_at) VALUES ('${ID}', 'nope', 'x', 1, 1)`),
    ).toThrow(/FOREIGN KEY/);
  });

  it("rejects absolute image paths", () => {
    insertRecord();
    for (const path of ["/home/a.jpg", "\\a.jpg", "C:/a.jpg"]) {
      expect(() =>
        db.exec(
          `INSERT INTO record_images (id, record_id, kind, path, created_at, updated_at)
           VALUES ('${ID2}', '${ID}', 'gallery', '${path}', 1, 1)`,
        ),
      ).toThrow();
    }
  });

  it("allows one live cover per record, ignoring deleted ones", () => {
    insertRecord();
    const cover = (id: string, deleted: string) =>
      db.exec(
        `INSERT INTO record_images (id, record_id, kind, path, created_at, updated_at, deleted_at)
         VALUES ('${id}', '${ID}', 'cover', 'covers/a.jpg', 1, 1, ${deleted})`,
      );
    cover(ID2, "5");
    cover("5b4d0e3a-3f4e-4d7c-9a01-2c3d4e5f6071", "NULL");
    expect(() => cover("6c5e1f4b-4a5f-4e8d-8b12-3d4e5f607182", "NULL")).toThrow(/UNIQUE/);
  });

  it("blocks the same external item on two live records", () => {
    insertRecord();
    insertRecord(ID2);
    const link = (id: string, record: string) =>
      db.exec(
        `INSERT INTO external_links (id, record_id, provider, external_id, created_at, updated_at)
         VALUES ('${id}', '${record}', 'tmdb:movie', '329865', 1, 1)`,
      );
    link("5b4d0e3a-3f4e-4d7c-9a01-2c3d4e5f6071", ID);
    expect(() => link("6c5e1f4b-4a5f-4e8d-8b12-3d4e5f607182", ID2)).toThrow(/UNIQUE/);
  });

  it("purges children when a record is hard-deleted", () => {
    insertRecord();
    db.exec(`INSERT INTO history_entries (id, record_id, kind, text, created_at, updated_at) VALUES ('${ID2}', '${ID}', 'note', 'Loved it', 1, 1)`);
    db.exec(`DELETE FROM records WHERE id = '${ID}'`);
    expect(db.prepare("SELECT count(*) n FROM history_entries").get()).toEqual({ n: 0 });
  });
});
