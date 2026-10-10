# ADR 0002 — Deploy on Cloudflare Workers, not Pages

## Status

Accepted.

## Context

The original blog mixed the two: the Astro adapter and `wrangler.jsonc` target
Workers, while the `deploy` script used `wrangler pages deploy`.

## Decision

Target Cloudflare Workers. The Astro Cloudflare adapter is kept, and the Pages
deploy script is dropped.

## Consequences

- D1, R2 and Cloudflare Access bindings work without workarounds.
- One deployment target, one `wrangler.jsonc`.
- The old Pages script is removed from the blog during the swap (phase P7).
