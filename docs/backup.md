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
repository. On a public repository the action mirrors **published** articles
only; on a private repository it mirrors every status (`--all`).

- `content/articles/<slug>.mdx`: frontmatter + MDX body.
- `content/categories.json`: category names, slugs, positions.
- `content/media.json`: media key, dimensions, alt text.
- `content/manifest.json`: generation time, mode, counts.

The GitHub Action is opt-in. In the deployment repository, set:

- secret `CLOUDFLARE_API_TOKEN`
- secret `CLOUDFLARE_ACCOUNT_ID`
- secret `WRANGLER_DEPLOY_CONFIG` (the full `wrangler.deploy.jsonc`)
- variable `CONTENT_SYNC=true` to enable the schedule

Then run it by hand once:

```bash
gh workflow run content-sync.yml
```

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
bun run content:import -- --config=wrangler.deploy.jsonc --dry-run
bun run content:import -- --config=wrangler.deploy.jsonc
```

The import upserts by slug, recompiles MDX with the current component set, and
recreates media rows from `media.json`. It never deletes articles. R2 objects
must still exist.

## Local restore drill

Run this against a throwaway local D1, never against production:

```bash
rm -rf .wrangler/state
bunx wrangler d1 migrations apply DB --local --persist-to "$PWD/.wrangler/state"
bun run content:import -- --local --dir=content --config=wrangler.jsonc
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
bunx wrangler d1 info DB --config wrangler.deploy.jsonc
bunx wrangler d1 time-travel info DB --config wrangler.deploy.jsonc

# 2. Note a bookmark for a known-good timestamp
bunx wrangler d1 time-travel info DB --config wrangler.deploy.jsonc \
  --timestamp="2026-10-24T12:00:00Z"

# 3. Restore (interactive confirmation; note the undo bookmark it prints)
bunx wrangler d1 time-travel restore DB --config wrangler.deploy.jsonc \
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
bunx wrangler d1 export DB --remote --config wrangler.deploy.jsonc \
  --output=/tmp/pre-migration.sql
```

## Media cleanup

On every article save, images removed from the body or replaced as the cover
are deleted from R2 (original and `@480`/`@800`/`@1200` variants) **when no
current article or document references them**. Orphan uploads are removed by:

```bash
bun run media:gc -- --bucket=pzz-cms-media --config=wrangler.deploy.jsonc --dry-run
bun run media:gc -- --bucket=pzz-cms-media --config=wrangler.deploy.jsonc
```

This is deliberate: images are not versioned and not backed up.
