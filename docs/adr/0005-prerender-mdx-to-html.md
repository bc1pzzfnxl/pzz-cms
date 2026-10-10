# ADR 0005 — Pre-render MDX to HTML at save time

## Status

Accepted.

## Context

Articles are authored and stored as MDX (`body_mdx`), because MDX allows
components inside the body. The site is server-rendered on Cloudflare Workers.

Cloudflare Workers block dynamic code evaluation (`eval` / `new Function`). The
MDX runtime compiler (`@mdx-js/mdx` `evaluate`) uses `new Function`, so it cannot
run on the Worker at request time. Compiling at build time is not possible
either, because content lives in D1 and publishing must be immediate.

## Decision

Pre-render MDX to HTML at save time, in the browser (where `eval` is allowed),
and store the result in `body_html` next to `body_mdx`. The public route renders
`body_html`; `body_mdx` stays the source of truth for editing.

## Consequences

- The public page returns complete HTML with no runtime compilation: fast and
  SEO-friendly.
- Component output is frozen in `body_html`. Changing a component requires
  re-rendering the affected articles (a batch job).
- Animated components (`numbers`, `kugiri`) need a hydration step to be
  interactive; planned in P8.
- The admin (P2) owns the MDX → HTML compilation.
