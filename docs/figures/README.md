# Figures

Text figures drawn with [glyph-kit](https://glyph-kit.traykov.cc) from the specs
in this folder. The generator is not vendored, so install it before redrawing:

```bash
bunx skills add alextraykov/glyph-kit -y
node .agents/skills/glyph-kit/scripts/glyph-kit.mjs render docs/figures/save-pipeline.json --to text
```

| Spec                     | Used in              | Type           |
| ------------------------ | -------------------- | -------------- |
| `save-pipeline.json`     | `README.md`          | `flow`         |
| `template-sync.json`     | `docs/deployment.md` | `branchFlow`   |
| `article-lifecycle.json` | `docs/slug.md`       | `stateMachine` |

Paste the output between fences. Keep the title line only when the prose around
the figure does not already state it.

The architecture figure in `README.md` is drawn by hand: no glyph-kit type
shows two writers converging on one store. Lint it after editing:

```bash
node .agents/skills/glyph-kit/scripts/lint.mjs README.md
```
