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
shift) and its alt text. Stored in the `media` table.

## Content module

The single module that reads and writes articles, redirects and media. It hides
D1 behind a small interface (`getArticle`, `listPublished`, `saveDraft`,
`publish`). No other module talks to the database directly.

## Admin

The `/admin` area, protected by Cloudflare Access. Single user.

## Public site

Everything served to visitors and crawlers: the home page, article pages, the
sitemap, the RSS feed, `robots.txt` and `llms.txt`.

## Parity

The state where the new engine answers the same URLs as the old blog, with the
same status codes, titles, canonical tags and JSON-LD. Checked by a script
during migration.

## Auth provider

The module behind the auth seam: `password` (default), `access`, or `none`.
Selected by `AUTH_PROVIDER`. See ADR 0007.

## Session

An authenticated visit: a cookie mapped to a row in the auth store. Created on
password sign-in, lasting 30 days.

## Owner

The single account allowed into the admin. There is no signup; the owner row is
created during the setup.
