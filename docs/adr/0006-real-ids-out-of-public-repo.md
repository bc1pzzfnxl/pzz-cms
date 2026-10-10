# ADR 0006 — Real Cloudflare IDs stay out of the public repo

## Status

Accepted.

## Context

The CMS repository is public, but deploying it needs real Cloudflare resource
IDs (the D1 database id, the R2 bucket). Committing them would expose account
internals and contradict the data policy (ADR 0004).

## Decision

`wrangler.jsonc` in the repository stays a template with placeholder IDs. Real
IDs live in a gitignored `wrangler.deploy.jsonc`, used only to build and deploy:

```bash
bun run build
bunx wrangler deploy --config wrangler.deploy.jsonc
```

Remote D1 operations (migrations, article import) use the same `--config`.

## Consequences

- The public repository never carries real account identifiers.
- Contributors deploy to their own resources by copying the template.
- The operator keeps one extra local file; it is created once and gitignored.
