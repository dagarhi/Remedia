-- History becomes a mixed log: user notes plus status and rating events recorded by the app.
-- Events store the fact (the new status or rating), never a sentence: the UI builds the text
-- in the current language. SQLite cannot change constraints in place, so the table is rebuilt.

CREATE TABLE history_entries_new (
  id          TEXT PRIMARY KEY CHECK (length(id) = 36 AND id = lower(id)),
  record_id   TEXT NOT NULL REFERENCES records (id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('note', 'status', 'rating')),
  text        TEXT,                            -- note only
  status      TEXT CHECK (status IN ('planned', 'in_progress', 'paused', 'completed', 'dropped')),
  rating      INTEGER CHECK (rating BETWEEN 1 AND 100), -- rating event; NULL = rating removed
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER,
  CHECK (
    (kind = 'note' AND text IS NOT NULL AND trim(text) <> '' AND status IS NULL AND rating IS NULL)
    OR (kind = 'status' AND status IS NOT NULL AND text IS NULL AND rating IS NULL)
    OR (kind = 'rating' AND text IS NULL AND status IS NULL)
  )
) STRICT;

-- Existing entries were all free text: they become notes.
INSERT INTO history_entries_new (id, record_id, kind, text, created_at, updated_at, deleted_at)
  SELECT id, record_id, 'note', text, created_at, updated_at, deleted_at FROM history_entries;

DROP TABLE history_entries;
ALTER TABLE history_entries_new RENAME TO history_entries;
CREATE INDEX history_entries_record ON history_entries (record_id, created_at);

-- Records created before this migration get their starting status line ("Added to ..."),
-- dated when the record was created. The id is a random lowercase UUID v4.
INSERT INTO history_entries (id, record_id, kind, status, created_at, updated_at, deleted_at)
  SELECT
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
      substr(lower(hex(randomblob(2))), 2) || '-' ||
      substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
      lower(hex(randomblob(6))),
    id, 'status', status, created_at, created_at, deleted_at
  FROM records;
