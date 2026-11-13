-- 0003_categories.sql — categories for the blog.
--
-- One category per article (nullable). Deleting a category leaves its
-- articles uncategorised; the home groups the rest.

CREATE TABLE categories (
  id         TEXT PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

ALTER TABLE articles ADD COLUMN category_id TEXT REFERENCES categories(id);

CREATE INDEX idx_articles_category ON articles (category_id);
CREATE INDEX idx_categories_position ON categories (position, name);
