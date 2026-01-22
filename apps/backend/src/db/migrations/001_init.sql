CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  picture_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  metadata_interests TEXT NOT NULL,
  metadata_goals TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS family_members (
  family_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  phone_number TEXT,
  PRIMARY KEY (family_id, user_id)
);

CREATE TABLE IF NOT EXISTS family_todos (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL,
  assigned_to_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS family_meals (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  scheduled_for TEXT,
  servings INTEGER,
  recipe_url TEXT,
  assigned_to_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS family_projects (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL,
  status TEXT NOT NULL,
  timeframe_start_date TEXT,
  timeframe_target_end_date TEXT,
  timeframe_extensions TEXT NOT NULL,
  tags TEXT NOT NULL,
  items TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
