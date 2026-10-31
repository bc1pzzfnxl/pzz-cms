# T6 — Documentation

## Status: done

## Blocking edges: T1..T5 (describes the final state)

## Work

1. `docs/adr/0008-split-site-cms.md` — the decision (structure, commands,
   security model, cutover), referencing `docs/spec/split-site-cms.md` and
   `docs/research/turborepo.md`.
2. `PLAN.md`: mark this phase done, adjust future phases.
3. `README.md`: new model — deployed site + local CMS (`bun run dev:cms`),
   no auth section.
4. `docs/template-vs-blog.md`: shared list becomes `apps/site`,
   `packages/core`, `migrations/`, `scripts/`, root manifests, docs; sync
   procedure updated; `apps/cms` never synced.
5. `docs/backup.md`: add the auth-drop runbook (D1 DROP TABLE + secret
   deletion) and confirm Time Travel coverage.
6. `GLOSSARY.md`: terms (CMS local, apps, packages).
7. `AGENTS.md`: new commands and layout. `CONTRIBUTING.md`: same.

## Done when

- Docs match the implemented structure; `bun run check` unaffected; links
  between docs resolve.
