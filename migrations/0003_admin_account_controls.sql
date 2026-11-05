ALTER TABLE admin_users ADD COLUMN locked INTEGER NOT NULL DEFAULT 0
  CHECK (locked IN (0, 1));

ALTER TABLE admin_users ADD COLUMN last_sign_in_at TEXT;

CREATE TABLE IF NOT EXISTS admin_signins (
  username TEXT PRIMARY KEY,
  last_sign_in_at TEXT NOT NULL
);
