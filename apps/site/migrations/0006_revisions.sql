-- 0006_revisions.sql — optimistic concurrency tokens.
--
-- Every article and document carries a revision counter. The admin sends the
-- revision it read; the update only applies when the row still has that
-- revision, so a second tab cannot silently overwrite the first. Status
-- changes do not bump `rev`: publishing does not touch the body.

ALTER TABLE articles ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;
ALTER TABLE documents ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;
