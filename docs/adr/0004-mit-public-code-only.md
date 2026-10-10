# ADR 0004 — MIT license, public code-only repository

## Status

Accepted.

## Context

pzz-cms is open source. The author's blog keeps private Markdown articles and
its Search Console history.

## Decision

License the project under MIT: allow use, modification and redistribution,
provided the copyright notice and license text are kept. Keep the CMS repository
public and code-only. Keep the blog repository private.

## Consequences

- Derivatives must keep the author's credit.
- No article, image, database dump or secret ever enters the public repo.
- Test fixtures are synthetic.
- The blog's articles are imported into D1 locally, never committed.
