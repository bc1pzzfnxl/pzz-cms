-- Synthetic fixtures for local development and CI. Not real content.
-- Apply after migrations: bunx wrangler d1 execute DB --local --file=./scripts/seed.sql

DELETE FROM articles;
DELETE FROM redirects;

INSERT INTO articles (id, slug, title, description, body_mdx, body_html, status, lang, published_at) VALUES
  ('seed-1', 'premier-article', 'Premier article', 'Résumé du premier article.', '# Premier article', '<p>Contenu du premier article.</p>', 'published', 'fr', '2026-01-02T00:00:00Z'),
  ('seed-2', 'second-article', 'Second article', 'Résumé du second article.', '# Second article', '<p>Contenu du second article.</p>', 'published', 'fr', '2026-03-04T00:00:00Z'),
  ('seed-3', 'brouillon', 'Brouillon', 'Pas publié.', '# Draft', '<p>Brouillon.</p>', 'draft', 'fr', NULL);

INSERT INTO redirects (from_path, to_path) VALUES ('/ancien-slug/', '/premier-article/');
