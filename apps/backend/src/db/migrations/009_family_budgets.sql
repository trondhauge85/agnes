CREATE TABLE IF NOT EXISTS family_budgets (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT NOT NULL,
  estimated_expenses REAL NOT NULL,
  actual_expenses REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
