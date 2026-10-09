import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { HISTORY_KINDS, IMAGE_KINDS, RECORD_STATUSES, type RecordFields } from "../record";
import type { UserTemplateDefinition } from "../template";

/*
 * Drizzle description of the tables, used to build typed queries. The structure itself
 * (STRICT, CHECKs, partial indexes) is created by the hand-written SQL in /migrations,
 * which is the source of truth; a test checks both stay in sync.
 * Property names match the column names (snake_case), so rows match the model types.
 */

const timestamps = {
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
  deleted_at: integer("deleted_at"),
};

export const templates = sqliteTable("templates", {
  id: text("id").primaryKey(),
  name: text("name"),
  definition: text("definition", { mode: "json" }).$type<UserTemplateDefinition>().notNull(),
  ...timestamps,
});

export const records = sqliteTable("records", {
  id: text("id").primaryKey(),
  template: text("template")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
  parent_id: text("parent_id"),
  title: text("title").notNull(),
  original_title: text("original_title"),
  status: text("status", { enum: RECORD_STATUSES }).notNull(),
  rating: integer("rating"),
  notes: text("notes"),
  fields: text("fields", { mode: "json" }).$type<RecordFields>().notNull(),
  ...timestamps,
});

export const historyEntries = sqliteTable("history_entries", {
  id: text("id").primaryKey(),
  record_id: text("record_id")
    .notNull()
    .references(() => records.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: HISTORY_KINDS }).notNull(),
  text: text("text"),
  status: text("status", { enum: RECORD_STATUSES }),
  rating: integer("rating"),
  ...timestamps,
});

export const recordImages = sqliteTable("record_images", {
  id: text("id").primaryKey(),
  record_id: text("record_id")
    .notNull()
    .references(() => records.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: IMAGE_KINDS }).notNull(),
  path: text("path").notNull(),
  caption: text("caption"),
  position: integer("position").notNull(),
  ...timestamps,
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  normalized_name: text("normalized_name").notNull(),
  ...timestamps,
});

export const recordTags = sqliteTable(
  "record_tags",
  {
    record_id: text("record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    tag_id: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.record_id, t.tag_id] })],
);

export const externalLinks = sqliteTable("external_links", {
  id: text("id").primaryKey(),
  record_id: text("record_id")
    .notNull()
    .references(() => records.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  external_id: text("external_id").notNull(),
  ...timestamps,
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updated_at: integer("updated_at").notNull(),
});
