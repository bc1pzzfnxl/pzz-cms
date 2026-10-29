# Glossary

The shared vocabulary of pzz-cms. Keep it short and precise.

## Article

A unit of content: one MDX body plus its metadata (title, description, slug,
status, dates). Stored as a row in the `articles` table. The file name concept
from the old blog is replaced by the `slug`.

## Slug

The ASCII, kebab-case identifier of an article, used in its URL
(`/[slug]/`). Generated from the title with accents removed. Unique. Changing
it after publication creates a redirect.

## Title

The human-readable heading of an article, with full accents and French
capitalization. Feeds `<h1>`, `<title>` and JSON-LD. The accent rule lives in
the SEO skill and the project checklist: accented UI titles, ASCII slugs.

## Status

An article is `draft` or `published`. Only published articles are visible on the
public site and in the sitemap and RSS feed.

## Redirect

A 301 mapping from an old path to a new one, stored in the `redirects` table.
Created automatically when a published article's slug changes.

## Media

An uploaded image: the R2 object key, its pixel dimensions (for zero layout
shift) and its alt text. Stored in the `media` table. The original WebP is kept
untouched; smaller variants (`@480`, `@800`, `@1200`) are derived copies.

## Media variant

A resized WebP generated from a media original, stored next to it in R2 and
served through `srcset`/`sizes`. The original is the largest candidate.

## Cover

The image attached to an article (`og_image_key`). Its alt text is stored on the
media row, shown under the image and used as the image `alt`. When it is empty,
the article title is the fallback.

## Home

The public index at `/`: a short introduction, categories with their articles
as a bare slug plus date, and a hover preview loaded only when requested.

## Category

A named group of articles, with a slug, an optional description and an ordered
position. One category per article, nullable. The home groups articles by
category and links to its public page at `/categorie/<slug>/`; deleting a
category leaves its articles uncategorised.

## Document

A JSON document rendered as a page at `/<slug>/`, separate from articles. Stored
in the `documents` table. The author page can be a document or a static route.

## Content module

The single module that reads and writes articles, categories, media, documents
and redirects. It hides D1 behind the `Content` interface. No other module talks
to the database directly.

## Admin (CMS app)

The `/admin` area, living in `apps/cms` (`@pzz-cms/cms`). It runs **locally
only** through `wrangler dev --remote` and writes directly to the production
D1/R2. It is never deployed and has no authentication: localhost is the
boundary. See ADR 0008.

## Template

`pzz-cms`, the public, generic upstream. It ships code, docs and example
configuration only: no article, image, real Cloudflare id or secret.

## Deployment

A site built from the template (for example `bc1pzzfnxl-blog`). It owns its
`src/lib/site.ts`, its Cloudflare resources and its content. See
`docs/template-vs-blog.md`.

## Public site

Everything served to visitors and crawlers: the home page, article pages, the
sitemap, the RSS feed, `robots.txt` and `llms.txt`.

## Parity

The state where the new engine answers the same URLs as the old blog, with the
same status codes, titles, canonical tags and JSON-LD. Checked by a script
during migration.

## Site app

`apps/site` (`@pzz-cms/site`): the public site, the only deployable app. Reads
D1/R2, serves pages, feeds, the sitemap and media.

## CMS app

`apps/cms` (`@pzz-cms/cms`): the local admin. See **Admin (CMS app)**.

## Core package

`packages/core` (`@pzz-cms/core`): the shared content module, helpers and MDX
components used by both apps.
