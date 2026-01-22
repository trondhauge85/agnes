CREATE TABLE IF NOT EXISTS email_auth_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  action TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  verified_at TEXT
);

CREATE INDEX IF NOT EXISTS email_auth_requests_email_idx
  ON email_auth_requests (email);
