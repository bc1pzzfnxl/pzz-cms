/**
 * Compute the character set actually used by the site: app source strings
 * (apps/site, packages/core UI copy) plus article content from a D1 dump.
 * Writes a summary: total chars, codepoints outside Latin-1/Ext-A, CJK presence.
 *
 * Usage: bun scripts/font-charset.ts <d1-dump.json>
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dumpPath = process.argv[2];
const dump = JSON.parse(readFileSync(dumpPath, "utf8")) as {
  results?: { title?: string; description?: string; body_mdx?: string; status?: string }[];
};
const rows = dump.results ?? dump[0]?.results ?? [];

let siteText = "";
function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!/(node_modules|\.wrangler|dist|\.git|\.astro)/.test(full)) walk(full);
    } else if (/\.(astro|tsx|ts|css|mjs)$/.test(entry)) {
      const src = readFileSync(full, "utf8");
      // Keep only string-ish content: crude but fine for charset purposes —
      // we strip import/URL noise below.
      siteText += src;
    }
  }
}
walk("apps/site/src");
walk("packages/core/src");

// Extract human-ish strings from source: text between quotes/tags. For charset
// purposes keep every literal character that looks like prose.
const literals = siteText.match(/"[^"\n]{3,}"|'[^'\n]{3,}'|>[^<>{}\n]{2,}</g) ?? [];
const sourceChars = literals.join(" ");

let contentText = "";
for (const row of rows) {
  contentText += ` ${row.title ?? ""} ${row.description ?? ""} ${row.body_mdx ?? ""}`;
}

// Strip markdown/MDX syntax noise and URLs from content text.
const contentProse = contentText
  .replace(/https?:\/\/\S+/g, " ")
  .replace(/[#*_`>~[\]()|]/g, " ")
  .replace(/[a-z0-9-]+\.[a-z]{2,}/gi, " ");

function census(text: string) {
  const cps = new Set<number>();
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && cp >= 0x20) cps.add(cp);
  }
  return cps;
}

const source = census(sourceChars);
const content = census(contentProse);
const all = new Set([...source, ...content]);

const outside = [...all].filter((cp) => !(cp <= 0x24f)).sort((a, b) => a - b);
const cjk = outside.filter(
  (cp) => (cp >= 0x2e80 && cp <= 0x9fff) || (cp >= 0x3000 && cp <= 0x303f),
);
const latin1 = [...all].filter((cp) => cp >= 0x80 && cp <= 0xff).sort((a, b) => a - b);
const latinExtA = [...all].filter((cp) => cp >= 0x100 && cp <= 0x17f).sort((a, b) => a - b);

console.log(
  JSON.stringify(
    {
      publishedCount: rows.filter((r) => r.status === "published").length,
      totalCount: rows.length,
      sourceCodepoints: source.size,
      contentCodepoints: content.size,
      totalCodepoints: all.size,
      latin1: latin1.map((cp) => String.fromCodePoint(cp)).join(""),
      latinExtA: latinExtA.map((cp) => String.fromCodePoint(cp)).join(""),
      outsideLatinBlocks: outside.map((cp) => `U+${cp.toString(16)} ${String.fromCodePoint(cp)}`),
      cjkCount: cjk.length,
    },
    null,
    2,
  ),
);
