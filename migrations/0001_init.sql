-- 0001_init.sql — initial content schema.
--
-- Articles live in D1 (see docs/adr/0001). The public site reads published
-- rows; the admin writes drafts and published rows. Media holds the intrinsic
-- dimensions used to keep Cumulative Layout Shift at zero.

CREATE TABLE articles (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  body_mdx     TEXT NOT NULL DEFAULT '',
  body_html    TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  lang         TEXT NOT NULL DEFAULT 'fr',
  og_image_key TEXT,
  author       TEXT,
  published_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_articles_status_published_at
  ON articles (status, published_at DESC);

CREATE TABLE redirects (
  from_path  TEXT PRIMARY KEY,
  to_path    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_redirects_to_path ON redirects (to_path);

CREATE TABLE media (
  id         TEXT PRIMARY KEY,
  r2_key     TEXT NOT NULL UNIQUE,
  width      INTEGER,
  height     INTEGER,
  alt        TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
