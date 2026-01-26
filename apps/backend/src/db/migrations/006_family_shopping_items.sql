CREATE TABLE IF NOT EXISTS family_shopping_items (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  quantity REAL,
  unit TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
