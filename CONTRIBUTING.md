# Contributing

## Setup

```bash
bun install
bun run dev
```

Bun is the only supported package manager. Do not use npm, pnpm or Yarn.

## Before you push

A pre-commit hook runs Biome, the typecheck and the unit tests. You can run the
same checks by hand:

```bash
bun run check
```

A phase is done only when its checks pass (typecheck, lint, tests).

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`,
`docs:`, `refactor:`, `test:`, `chore:`. Keep each commit focused on one change.

Branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`.

## Code style

- TypeScript with `strict`. Type every public boundary.
- Biome formats and lints. Run `bun run lint:fix` before committing.
- Docs, comments and identifiers in English. UI copy and article content stay in
  the site language.
- Prefer deep modules: a large surface of behaviour behind a small interface.

## Data policy

Never commit an article, Markdown content, image, database dump or secret. The
repository is public and holds code only. Local content lives in D1 and in
`.dev.vars` (gitignored).
