CREATE TABLE IF NOT EXISTS calendar_connections (
  provider TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  scopes TEXT NOT NULL,
  connected_at TEXT NOT NULL,
  user_email TEXT,
  updated_at TEXT NOT NULL
);
