CREATE TABLE IF NOT EXISTS calendar_selections (
  provider TEXT PRIMARY KEY,
  calendar_id TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
