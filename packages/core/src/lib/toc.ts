import { slugify } from "./slug";

export interface TocEntry {
  /** Anchor id injected on the heading element. */
  id: string;
  /** Heading text, inline tags stripped and entities unescaped. */
  text: string;
  /** Heading level: 2 for h2, 3 for h3. */
  level: number;
}

/** Do not render the Sommaire for an article with fewer headings than this. */
export const TOC_MIN_HEADINGS = 3;

const HEADING_PATTERN = /<(h[23])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
const EXISTING_ID = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function unescapeEntities(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, (entity) => ENTITIES[entity]);
}

/**
 * Inject a slug id on every h2/h3 of a precompiled article body and return
 * the table of contents entries. Headings that already carry an id keep it.
 * Pure string work: the article route runs it at render time, so the public
 * page ships no JavaScript for the Sommaire.
 */
export function withHeadingIds(html: string): { html: string; toc: TocEntry[] } {
  const used = new Set<string>();
  const toc: TocEntry[] = [];

  const out = html.replace(HEADING_PATTERN, (match, tag: string, attrs = "", inner: string) => {
    const text = unescapeEntities(
      inner
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
    const existing = attrs.match(EXISTING_ID);
    let id = existing ? (existing[1] ?? existing[2] ?? "") : slugify(text) || "section";
    if (!existing) {
      while (used.has(id)) id = `${id}-${used.size + 1}`;
    }
    used.add(id);
    toc.push({ id, text, level: tag.toLowerCase() === "h2" ? 2 : 3 });
    return existing ? match : `<${tag} id="${id}"${attrs}>${inner}</${tag}>`;
  });

  return { html: out, toc };
}
