CREATE TABLE IF NOT EXISTS site_content (
  scope TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip_key TEXT NOT NULL,
  attempt_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS login_attempts_ip_time
  ON login_attempts (ip_key, attempt_at);
