-- Key/value settings written from the admin. The public site reads them at
-- render time; "theme" holds the site palette edited in /admin/apparence/.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT
);
