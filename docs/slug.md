# Authoring a slug page

How an article becomes a page at `/{slug}/`: what runs on the server, what runs
in the browser, how to write the MDX, and what a new component must respect.

The short version: **the admin compiles MDX to static HTML and stores it; the
Worker only serves that HTML; the browser adds motion.** Nothing compiles MDX at
request time.

## 1. The pipeline

```
admin (browser)                         Cloudflare
┌──────────────────────────┐            ┌──────────────────────────┐
│ MDXEditor                │            │ Worker (SSR)             │
│   body_mdx               │            │   [slug].astro           │
│      │                   │            │     body_html            │
│      ▼                   │  save      │       │                  │
│ renderMdxToHtml          │ ─────────► │       ▼                  │
│   evaluate (MDX)         │   D1       │   <article>…</article>   │
│   renderToStaticMarkup   │            │       │                  │
│   prepareMdxHtml         │            │       ▼                  │
│      │                   │            │   HTML response          │
│      ▼                   │            └──────────────────────────┘
│   body_html              │                        │
└──────────────────────────┘                        ▼
                                         ┌──────────────────────────┐
                                         │ browser                  │
                                         │ enhance-articles.ts      │
                                         │   stats, reveals, motion │
                                         └──────────────────────────┘
```

`body_mdx` is the source of truth for editing; `body_html` is the compiled
artifact that the page serves.

Why not compile at request time: Cloudflare Workers block `new Function`, which
`@mdx-js/mdx` uses. See [ADR 0005](./adr/0005-prerender-mdx-to-html.md).

## 2. What runs where

| Step | Runs in | Notes |
| --- | --- | --- |
| MDX editor | admin browser | `ArticleEditor.tsx` |
| MDX → HTML | admin browser | `src/lib/render-mdx.ts` (`evaluate` + `renderToStaticMarkup`) |
| Static-state cleanup | admin + Worker | `src/lib/mdx-html.ts` (`prepareMdxHtml`) |
| Storage | D1 | `body_mdx`, `body_html` |
| Page rendering | Worker | `src/pages/[slug].astro`, `set:html` |
| Cover/body images | R2 via `/media/<key>/` | `optimizeBodyImages` adds dimensions + lazy |
| Motion | browser | `src/lib/enhance-articles.ts` |
| Admin preview | admin browser | same compiler and component map as saving |

There is no React hydration of the article body. Everything that must animate is
driven by the small client script, not by the React components.

## 3. Writing the article

### Title and headings

- The `title` field becomes the page `<h1>`. Do **not** add a `#` heading in the
  body.
- Use `##` for sections and `###` for subsections. They drive the future table
  of contents.
- The SEO description comes from the `description` field, not from the first
  paragraph.

### Slugs

- The slug is generated from the title (ASCII kebab-case); you can override it.
- Changing a published slug creates a 301 in the `redirects` table and updates
  the sitemap. Never reuse an old slug for a different article.
- All URLs use a trailing slash (`trailingSlash: "always"`).

### Markdown first

Write prose in Markdown. Reach for a component only when a frame, table,
checklist, or timeline scans faster than a wall of bullets. At most two figures
per section, with prose between them.

### Components need no import

Registered components are available globally in every article:

```mdx
<Callout type="warning">
  Ce passage a des variantes manuscrites.
</Callout>
```

There is no `import` statement to write: the admin compiles with the fixed map
in `src/lib/mdx-components.ts`. Adding a component means adding it to that map,
not importing it per article.

The editor registers every component with MDXEditor's `jsxPlugin`
(`ArticleEditor.tsx`), so a known tag survives the rich-text view. Pasting a
known component is intercepted and inserted through the Markdown parser, so it
becomes a JSX node instead of escaped text; preview and save also unescape
known component tags as a safety net. An unknown tag still falls back to Source
mode. If a tag was already saved with backslashes (`\<Callout`), remove it and
paste the clean tag.

### Available components

| Component | Use for |
| --- | --- |
| `Callout` | a caveat, tip, warning, or breaking note |
| `Quote` | one sentence someone else said, with a name under it |
| `Verse` | a scripture quotation with a reference and an optional original-language line |
| `Steps` | a procedure; bold is the current step, italic the next |
| `Terminal` | a command and its output |
| `Faq` | questions and answers |
| `Figure` | an image with a caption and an optional credit |
| `GraphStat` | two to four large numbers |
| `GraphTable` | tabular data |
| `GraphTimeline` | dated events, one marked current |
| `Stat` | one inline number, with an optional counter |
| `Reveal` | opt in to the word reveal for a block |

Grammar rules (shared by mdxcn components):

- `**bold**` — now, chosen, the total, the row to read (accent).
- `*italic*` — next, rejected, an aside (muted).
- `- label: value` — one row.
- `x — note` — a muted aside or caption.
- `- [x] done` — a checked box.
- `### heading` — a section or a question, depending on the component.
- `| table |` — data; a last row in bold is the footer.

Examples:

```mdx
<Quote by="Paul Graham" source="Taste for Makers">
  A thousand barely audible voices all singing in tune.
</Quote>

<Verse reference="Jean 3:16" version="LSG">
  Car Dieu a tant aimé le monde qu'il a donné son Fils unique…
</Verse>

<Verse
  reference="Psaume 12:2"
  version="TM"
  original="הוֹשִׁיעָה יְהוָה כִּי־גָמַר חָסִיד"
  originalLabel="Hébreu"
>
  Sauve, Éternel ! Car l'homme loyal a disparu.
</Verse>

<Steps title="MIGRATION">
1. **Sauvegarder** la base

   Exporter le fichier D1.

2. *Migrer*

   Appliquer `0003_…sql`.
</Steps>

<GraphTimeline title="CHRONOLOGIE">
- 70: destruction du Temple
- **135: révolte de Bar Kokhba**
- *200: compilation de la Mishna*
</GraphTimeline>

<GraphTable title="MANUSCRITS">
| Sigle | Date | Contenu |
| --- | --- | --- |
| ℵ | IVe s. | Ancien Testament |
| B | IVe s. | Bible complète |
</GraphTable>
```

### Images

Upload the image in the admin first, then reference its media path:

```mdx
![Bas-relief de Ninive](/media/images/ninive-abc123.webp/)
```

For a visible caption and a credit, use `Figure`:

```mdx
<Figure
  src="/media/images/ninive-abc123.webp/"
  alt="Bas-relief de Ninive"
  caption="Bas-relief assyrien représentant la prise de Ninive."
  credit="Source : British Museum"
/>
```

`alt` is required. `caption` and `credit` are optional. `Figure` accepts
`href` (link around the image) and explicit `width`/`height` for external
images.

`optimizeBodyImages` adds intrinsic `width`/`height` from the media table,
`loading="lazy"`, and `decoding="async"`. Body images are never preloaded; only
the cover is. Alt text is required for accessibility and image SEO.

## 4. Motion and static rendering

The design rule: **the text is always in the HTML; motion is added by the
browser.** The project deliberately ignores `prefers-reduced-motion` (the
effects are lightweight), so motion is always on.

mdxcn components use `motion` with `initial="hidden"`. A static render would
otherwise write:

```html
style="opacity:0;transform:translateY(8px)"
```

and the content would stay invisible, because nothing hydrates the article.
`prepareMdxHtml` fixes this in two places:

1. after compiling, in `renderMdxToHtml` (new rows);
2. when rendering an article, in `[slug].astro` (rows compiled before the fix).

It removes the hidden pair and adds `data-mdx-reveal`:

```html
<div data-mdx-reveal="">…</div>
```

`enhance-articles.ts` observes those markers and adds `data-revealed` when they
enter the viewport. `global.css` scopes the hidden state to
`[data-enhance="on"]`, which the script sets, so **without JS the content is
visible**. The animation is always on; there is no reduced-motion check.

The enhancer runs on Astro's `astro:page-load`, not only on the first
`DOMContentLoaded`: the ClientRouter swaps the body without reloading scripts,
so a page reached by clicking a link would otherwise never be split until a full
refresh. Each target carries a guard, so a double event does not split twice.

kugiri wraps the gap between words in an inline-block box; some browsers drop
that space from a text selection, so copying a split heading produced
`motmot`. `global.css` sets `white-space: pre` on those boxes to keep the gap
copyable.

Consequences for a new component:

- Never rely on React state or effects for the initial content: the public page
  has no hydration.
- Never leave content hidden in the static output. If you animate, use motion's
  `fadeUp` convention (`opacity:0;transform:translateY(8px)`) so
  `prepareMdxHtml` can convert it, or render the final state and let the client
  enhancer add motion.
- Do not use `useReducedMotion` to decide the static output: that bakes the
  author's OS setting into the published HTML.

## 5. Adding a component

1. **Write a React component** under `src/components/` (`.tsx`, not `.astro`).
   Astro components cannot be rendered by the MDX compiler.
2. **Register it** in `src/lib/mdx-components.ts`. The map is global; no import
   in the article.
3. **Make it static-safe.** It must render meaningful, visible HTML with
   `renderToStaticMarkup`. If it uses motion, follow the fade-up convention and
   verify `prepareMdxHtml` removes the hidden pair.
4. **Style it** with Tailwind classes and the mdxcn tokens
   (`src/styles/mdxcn.css`). Support `html.dark-mode`.
5. **Test it** in `tests/unit/render-mdx.test.ts`: compile a fixture, assert the
   text is present, assert the output has no `opacity:0`, and assert
   `data-mdx-reveal` when it animates.
6. **Sync the blog.** The CMS is the upstream template; copy the component, the
   map, the styles, and the tests to the blog repo, then deploy.
7. **Recompile the articles that use it.** `body_html` is frozen at save time; a
   component change does not update old rows. Re-save the article (or run a
   batch recompile) after changing a component.

## 6. SEO and performance checklist

- One `<h1>` per page (the title); sections start at `##`.
- `description` is written for search results; the body's first paragraph is
  not a substitute.
- The HTML is complete: no content depends on JS to exist or be readable.
- Cover image: WebP, `width`/`height`, eager + `fetchpriority="high"`.
- Body images: WebP, `width`/`height`, lazy, no preload.
- Canonical URL is `/{slug}/`; `BlogPosting` + `BreadcrumbList` JSON-LD are
  emitted by `[slug].astro`.
- A slug change creates a 301; the sitemap is generated from published rows.
- The Worker never compiles MDX: TTFB stays low.
- Motion is a client-only enhancement; it never blocks first paint.

## 7. Debugging

| Symptom | Check |
| --- | --- |
| A component is blank on the public page | `body_html` in D1 for `opacity:0`; the page should normalize it. Re-save if needed. |
| The admin preview differs from the public page | The preview uses the same compiler; check that the component is in `mdx-components.ts` and the CSS is imported. |
| An image has no dimensions | Upload it through the admin so the `media` row has `width`/`height`. |
| A new component is missing in the preview | It is not registered in `src/lib/mdx-components.ts`. |
| The animation does not run | The component has no `data-mdx-reveal`, or `enhance-articles` did not load. After a client-side navigation, the enhancer must re-run on `astro:page-load`. |
| Copying a heading yields `motmot` | The kugiri gap boxes lost their space in the selection; `white-space: pre` on those boxes fixes it. |
| A pasted component tag has no spaces | `<Callouttype="tip">` is not `Callout`; the MDX compiler sees a different component. Paste the snippet as a code block, or use the editor's source mode. |
| A pasted component appears escaped as text | The paste interceptor handles known tags; if it still happens, use Source mode. Preview and save unescape known tags. |
| An old slug returns 404 | Check the `redirects` table; the 301 is created when the slug changes in the admin. |

## 8. File map

| File | Role |
| --- | --- |
| `src/pages/[slug].astro` | serves articles, JSON documents, and 301s |
| `src/lib/render-mdx.ts` | MDX → static HTML, in the admin |
| `src/lib/mdx-html.ts` | converts motion's hidden state into a reveal marker |
| `src/lib/mdx-components.ts` | the global component map |
| `src/lib/enhance-articles.ts` | stats, article reveal, component reveal |
| `src/styles/global.css` | article and reveal styles |
| `src/styles/mdxcn.css` | mdxcn tokens and frame utilities |
| `src/components/admin/ArticleEditor.tsx` | editor, live preview, save |
| `tests/unit/render-mdx.test.ts` | compile and static-safety tests |
