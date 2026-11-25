-- 0004_category_description.sql — optional description for category pages.
--
-- The description is rendered on /categorie/<slug>/ and used as the page's
-- meta description when present.

ALTER TABLE categories ADD COLUMN description TEXT;
