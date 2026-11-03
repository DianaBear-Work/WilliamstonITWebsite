CREATE TABLE IF NOT EXISTS admin_users (
  username TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  session_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
