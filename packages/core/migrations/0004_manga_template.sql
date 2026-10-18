-- Built-in template row for manga, so records.template can reference it.
-- Timestamp 0, like the other built-ins, so the row is identical on every device.
INSERT INTO templates (id, name, definition, created_at, updated_at)
  VALUES ('manga', NULL, '{}', 0, 0);
