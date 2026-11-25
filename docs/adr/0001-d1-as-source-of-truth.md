# ADR 0001 — D1 is the source of truth for content

## Status

Accepted.

## Context

The original blog kept articles as `.md`/`.mdx` files in the repository, so
writing an article meant committing to Git. The owner wants the code flow (Git)
and the writing flow (the admin) to be separate.

## Decision

Articles live in Cloudflare D1 and are edited through the admin. The repository
holds code only. Publishing an article does not require a code commit or a
deployment.

## Consequences

- Code and content have independent lifecycles.
- Articles are no longer versioned by Git. A periodic export can compensate.
- A migration script imports the existing Markdown into D1 once.
- The public repo never contains article content.
