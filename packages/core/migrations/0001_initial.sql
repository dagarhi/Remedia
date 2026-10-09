-- Initial schema. Source of truth for the database structure on every platform.
-- Rules from the data model: STRICT tables, lowercase UUID ids, timestamps in ms UTC,
-- soft deletes (deleted_at) and partial unique indexes that ignore deleted rows.

CREATE TABLE templates (
  id          TEXT PRIMARY KEY,                -- readable for built-ins ("movie"), UUID for custom
  name        TEXT,                            -- NULL for built-ins (name comes from i18n)
  definition  TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(definition)),
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER
) STRICT;

-- Built-in rows exist so records.template can reference them. Timestamp 0 keeps them
-- identical on every device, so they never conflict on import.
INSERT INTO templates (id, name, definition, created_at, updated_at) VALUES
  ('movie',  NULL, '{}', 0, 0),
  ('series', NULL, '{}', 0, 0),
  ('book',   NULL, '{}', 0, 0),
  ('game',   NULL, '{}', 0, 0),
  ('season', NULL, '{}', 0, 0);

CREATE TABLE records (
  id              TEXT PRIMARY KEY CHECK (length(id) = 36 AND id = lower(id)),
  template        TEXT NOT NULL REFERENCES templates (id) ON DELETE CASCADE,
  parent_id       TEXT REFERENCES records (id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  original_title  TEXT,
  status          TEXT NOT NULL DEFAULT 'planned'
                    CHECK (status IN ('planned', 'in_progress', 'paused', 'completed', 'dropped')),
  rating          INTEGER CHECK (rating BETWEEN 1 AND 100),
  notes           TEXT,
  fields          TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(fields)),
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  deleted_at      INTEGER
) STRICT;

CREATE INDEX records_template ON records (template);
CREATE INDEX records_parent ON records (parent_id);

CREATE TABLE history_entries (
  id          TEXT PRIMARY KEY CHECK (length(id) = 36 AND id = lower(id)),
  record_id   TEXT NOT NULL REFERENCES records (id) ON DELETE CASCADE,
  text        TEXT NOT NULL CHECK (trim(text) <> ''),
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER
) STRICT;

CREATE INDEX history_entries_record ON history_entries (record_id, created_at);

CREATE TABLE record_images (
  id          TEXT PRIMARY KEY CHECK (length(id) = 36 AND id = lower(id)),
  record_id   TEXT NOT NULL REFERENCES records (id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('cover', 'gallery')),
  -- Relative to the images folder: no leading slash or backslash, no drive letter.
  path        TEXT NOT NULL CHECK (substr(path, 1, 1) NOT IN ('/', '\') AND instr(path, ':') = 0),
  caption     TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER
) STRICT;

CREATE INDEX record_images_record ON record_images (record_id);
-- At most one live cover per record.
CREATE UNIQUE INDEX record_images_one_cover ON record_images (record_id)
  WHERE kind = 'cover' AND deleted_at IS NULL;

CREATE TABLE tags (
  id               TEXT PRIMARY KEY CHECK (length(id) = 36 AND id = lower(id)),
  name             TEXT NOT NULL,
  normalized_name  TEXT NOT NULL,             -- computed by core (normalizeTagName)
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  deleted_at       INTEGER
) STRICT;

CREATE UNIQUE INDEX tags_normalized_name ON tags (normalized_name) WHERE deleted_at IS NULL;

CREATE TABLE record_tags (
  record_id   TEXT NOT NULL REFERENCES records (id) ON DELETE CASCADE,
  tag_id      TEXT NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER,
  PRIMARY KEY (record_id, tag_id)
) STRICT;

CREATE INDEX record_tags_tag ON record_tags (tag_id);

CREATE TABLE external_links (
  id           TEXT PRIMARY KEY CHECK (length(id) = 36 AND id = lower(id)),
  record_id    TEXT NOT NULL REFERENCES records (id) ON DELETE CASCADE,
  provider     TEXT NOT NULL,                 -- with scope when needed: "tmdb:movie", "tmdb:tv"
  external_id  TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  deleted_at   INTEGER
) STRICT;

CREATE INDEX external_links_record ON external_links (record_id);
-- The same provider item cannot be linked to two live records.
CREATE UNIQUE INDEX external_links_unique ON external_links (provider, external_id)
  WHERE deleted_at IS NULL;

CREATE TABLE settings (
  key         TEXT PRIMARY KEY,                -- stable keys defined in code, e.g. "rating_display.movie"
  value       TEXT NOT NULL CHECK (json_valid(value)),
  updated_at  INTEGER NOT NULL
) STRICT;
