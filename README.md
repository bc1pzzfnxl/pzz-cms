# pzz-cms

A light, MDX-first CMS built on [Astro](https://astro.build/) and Cloudflare
Workers. It stores articles in D1, edits them in an MDX editor, and renders an
SEO-focused blog with server-side rendering.

This project is developed in the open. It is generic: branding and the canonical
URL live in `src/lib/site.ts`, so it can drive any blog.

## Status

Early. Phase P0 (foundation) is complete. See [`PLAN.md`](./PLAN.md) for the
full roadmap.

## Stack

- Astro with the Cloudflare adapter, server-side rendering
- Cloudflare D1 for content, R2 for media
- MDX content, edited with MDXEditor
- Tailwind CSS v4
- Bun, TypeScript strict, Biome, Vitest, Playwright

## Requirements

- [Bun](https://bun.sh/)
- A Cloudflare account (for D1, R2, Access and deployment)

Node and npm are not required. Wrangler runs through Bun.

## Development

```bash
bun install
bun run dev          # Astro dev server on http://localhost:4321
```

`astro dev` runs the Cloudflare Vite plugin on the real `workerd` runtime. If
your environment blocks `workerd` (some sandboxes do), fall back to
`bun run build` plus the checks below.

## Checks

```bash
bun run check        # Biome + Astro typecheck + Vitest
bun run lint         # Biome only
bun run typecheck    # Astro check
bun run test         # Vitest
```

## Deployment

```bash
bun run deploy       # astro build && wrangler deploy
```

`wrangler.jsonc` is a template. Fill in your own D1 and R2 IDs before deploying.

## Data policy

This repository holds code only. Articles, images, database contents and
secrets are never committed. Test fixtures are synthetic.

## License

[MIT](./LICENSE) © bc1pzzfnxl.
