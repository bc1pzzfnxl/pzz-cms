# Content history and recovery

The deployment has no separate backup product. Recovery relies on two layers:

| Layer | Scope | Window | Restores |
| --- | --- | --- | --- |
| Git mirror (`content/`) | articles, categories, media metadata | forever | text, by re-import |
| D1 Time Travel | whole database | 7 days (Free) / 30 days (Paid) | point-in-time database |

R2 images are **not** backed up. Replaced or orphaned images are deleted on
purpose to stay inside the free tier; an old Git revision that references a
deleted image will show a broken image.

## Git mirror

`content/` is written by `bun run content:sync` and committed by the deployment
repository. The deployment repository is private, so the mirror can include
every status (`--all`); a public repository must stay published-only.

- `content/articles/<slug>.mdx`: frontmatter + MDX body.
- `content/categories.json`: category names, slugs, positions.
- `content/media.json`: media key, dimensions, alt text.
- `content/manifest.json`: generation time, mode, counts.

The mirror is updated manually:

```bash
bun run content:sync -- --config=apps/site/wrangler.jsonc --all
```

There is no scheduled sync: run it when you want a new Git checkpoint.

## Undo one article

The editor has no revision table: history lives in Git.

1. Open the article's file history in the deployment repository, or:

   ```bash
   git log -p -- content/articles/<slug>.mdx
   git show <commit>:content/articles/<slug>.mdx
   ```

2. Copy the frontmatter and body into the admin editor, or re-import the file.
3. Save: the save rewrites `body_mdx` and `body_html` from the editor.

To re-import the whole mirror into D1:

```bash
bun run content:import -- --config=apps/site/wrangler.jsonc --dry-run
bun run content:import -- --config=apps/site/wrangler.jsonc
```

The import upserts by slug, recompiles MDX with the current component set, and
recreates media rows from `media.json`. It never deletes articles. R2 objects
must still exist.

## Local restore drill

Run this against a throwaway local D1, never against production:

```bash
rm -rf .wrangler/state
bunx wrangler d1 migrations apply DB --local --persist-to "$PWD/.wrangler/state" --config apps/site/wrangler.jsonc
bun run content:import -- --local --dir=content --config=apps/site/wrangler.jsonc
bunx wrangler d1 execute DB --local --persist-to "$PWD/.wrangler/state" \
  --command "SELECT COUNT(*) FROM articles"
```

Expected on the reference blog: 4 articles, 12 media rows, 2 categories.

## D1 Time Travel

Use it for a bad `DELETE`/`UPDATE`, a failed migration, or a schema change that
cannot be reversed by re-importing the mirror. It restores the **whole
database**, cancels in-flight queries, and overwrites the current state.

```bash
# 1. Check the database and the current bookmark
bunx wrangler d1 info DB --config apps/site/wrangler.jsonc
bunx wrangler d1 time-travel info DB --config apps/site/wrangler.jsonc

# 2. Note a bookmark for a known-good timestamp
bunx wrangler d1 time-travel info DB --config apps/site/wrangler.jsonc \
  --timestamp="2026-10-24T12:00:00Z"

# 3. Restore (interactive confirmation; note the undo bookmark it prints)
bunx wrangler d1 time-travel restore DB --config apps/site/wrangler.jsonc \
  --timestamp="2026-10-24T12:00:00Z"
```

Limits:

- 30 days on Workers Paid, 7 days on Free.
- The database must be on the `production` storage backend (`wrangler d1 info`
  shows `version: production`).
- No forking yet: there is no staging clone to test a restore against. Use the
  local drill above or export/import into a new database.

Before a risky migration, take an export (not a backup system, just a restore
point):

```bash
bunx wrangler d1 export DB --remote --config apps/site/wrangler.jsonc \
  --output=/tmp/pre-migration.sql
```

## Media cleanup

On every article save, images removed from the body or replaced as the cover
are deleted from R2 (original and `@480`/`@800`/`@1200` variants) **when no
current article or document references them**. Orphan uploads are removed by:

```bash
bun run media:gc -- --bucket=pzz-cms-media --config=apps/site/wrangler.jsonc --dry-run
bun run media:gc -- --bucket=pzz-cms-media --config=apps/site/wrangler.jsonc
```

This is deliberate: images are not versioned and not backed up.


## Auth drop (post-split cleanup)

Since ADR 0008 the admin is local-only and Better Auth is gone. If an older
deployment still carries its tables and secrets, remove them once the new site
is deployed:

```bash
# 1. Drop the auth tables (Better Auth created them at runtime, not in
#    migrations/). Time Travel covers the next 7 days if anything is wrong.
bunx wrangler d1 execute DB --remote --config apps/site/wrangler.jsonc \
  --command "DROP TABLE IF EXISTS user; DROP TABLE IF EXISTS session; \
             DROP TABLE IF EXISTS account; DROP TABLE IF EXISTS verification;"

# 2. Remove the auth secrets from the Worker.
bunx wrangler secret delete BETTER_AUTH_SECRET --config apps/site/wrangler.jsonc
bunx wrangler secret delete BETTER_AUTH_URL --config apps/site/wrangler.jsonc
bunx wrangler secret delete SETUP_TOKEN --config apps/site/wrangler.jsonc
bunx wrangler secret delete OWNER_EMAIL --config apps/site/wrangler.jsonc
bunx wrangler secret delete ACCESS_TEAM_DOMAIN --config apps/site/wrangler.jsonc
bunx wrangler secret delete ACCESS_AUD --config apps/site/wrangler.jsonc
```

The site Worker itself needs no secrets: only the `DB` and `MEDIA` bindings.
