-- 0002_documents.sql — JSON documents rendered as pages.
--
-- A document is a JSON file (any shape) served at /<slug>/. The renderer is
-- generic; the raw JSON is stored as-is, so the page can evolve without a
-- schema change.

CREATE TABLE documents (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  body_json    TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_documents_status_published_at
  ON documents (status, published_at DESC);
