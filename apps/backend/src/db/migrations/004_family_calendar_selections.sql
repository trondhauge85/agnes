CREATE TABLE IF NOT EXISTS family_calendar_selections (
  family_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (family_id, provider)
);
