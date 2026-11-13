/**
 * Optimize the site's web fonts. Run by hand; the output is committed.
 *
 * What it does, per font (Geist Variable body font, Geist Mono):
 *  1. Compute the character set the site actually uses, from app source text
 *     (apps/site/src, packages/core/src) plus article content from a D1 dump.
 *  2. Intersect with the characters the current font files cover, so rendering
 *     never changes: characters the font lacks today (Hebrew, box drawing,
 *     ←/→, CJK, …) keep falling back to system fonts.
 *  3. Add Latin-1 and Latin Extended-A coverage (kept even when unused, as
 *     long as the current file covers them).
 *  4. Split into two files:
 *       - a core (ASCII, Latin-1/Latin-Extended-A letters, combining marks,
 *         « », curly quotes, dashes, ellipsis) — preloaded by MainLayout.
 *         Letters and marks must stay in the same file as ASCII: kerning and
 *         mark positioning cannot cross a unicode-range boundary, and losing
 *         them changes line wrapping (measured, see CORE_PROSE below);
 *       - an extended file (Latin-1 symbols) behind `unicode-range`, downloaded
 *         only when a page uses one of its characters.
 *  5. Keep the variable wght axis untouched (CLAMP_WGHT is false on purpose:
 *     instancing to 400-700 altered interpolated kern deltas at weight 600 and
 *     reflowed a heading).
 *  6. Keep only the OpenType features that can apply (ccmp liga kern mark mkmk
 *     tnum; dnom/numr/frac/pnum are never requested by any CSS) and drop
 *     hinting (no TrueType instructions exist in the source files).
 *
 * Inputs:
 *   bun scripts/optimize-fonts.ts <d1-content-dump.json>
 *   The dump is read-only, produced with:
 *     bunx wrangler d1 execute <db> --remote --json \
 *       --command "SELECT title, description, body_mdx, status FROM articles" > dump.json
 *
 * Outputs (committed):
 *   apps/site/public/fonts/*.woff2
 *   apps/site/src/styles/fonts.css   (@font-face with exact unicode-ranges)
 *
 * Rerun when: article content or UI copy starts using characters outside the
 * current set (the script prints a warning listing any such characters), or
 * the site starts using font weights outside 400-700, or the fontsource
 * packages are upgraded.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openSync as fontkitOpen } from "fontkit";
import subsetFont from "subset-font";

const OUT_DIR = "apps/site/public/fonts";
const CSS_PATH = "apps/site/src/styles/fonts.css";

/** Punctuation that most pages use: kept in the preloaded core file. */
const CORE_EXTRA = [
  0x2018,
  0x2019,
  0x201c,
  0x201d,
  0x2013,
  0x2014,
  0x2026, // ‘ ’ “ ” – — …
  0xab,
  0xbb, // « » (the quotes French prose actually uses)
];

/**
 * Letters beyond ASCII that appear in flowing prose. They must live in the
 * same file as ASCII: a unicode-range split between core and extended cannot
 * apply kerning or mark positioning across the font boundary, and losing pairs
 * like space+"à" changes line wrapping (proved: a paragraph gained 2.26px and
 * reflowed; likewise "Diyarbakır" with its dotless ı shifted a line by 1px).
 * This covers Latin-1 letters, Latin Extended-A letters, and combining marks.
 */
const CORE_PROSE: [number, number][] = [
  [0xc0, 0xf6], // À-ö (includes × U+00D7)
  [0xf8, 0xff], // ø-ÿ (÷ U+00F7 stays in ext: symbol, not prose)
  [0x100, 0x17f], // Latin Extended-A (œ Œ ı …)
  [0x300, 0x36f], // combining diacritical marks
];

const KEEP_FEATURES = ["ccmp", "liga", "kern", "mark", "mkmk", "tnum"];
const WGHT_MIN = 400;
const WGHT_MAX = 700;
/**
 * Clamping the wght axis (instancing) alters interpolated kern deltas at
 * intermediate weights (measured: an h2 at 600 got 0.375px narrower, which
 * changed a line break). Leave it null to keep the original axis until the
 * user approves the trade-off.
 */
const CLAMP_WGHT = false;

interface FontSpec {
  source: string;
  /** Family name used by the site CSS (unchanged: no Reserved Font Name). */
  family: string;
  variable: boolean;
  weightCss: string;
  fontDisplay: string;
  format: string;
  outPrefix: string;
}

const FONTS: FontSpec[] = [
  {
    source:
      "node_modules/.bun/@fontsource-variable+geist@5.3.0/node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
    family: "Geist Variable",
    variable: true,
    weightCss: CLAMP_WGHT ? `${WGHT_MIN} ${WGHT_MAX}` : "100 900",
    fontDisplay: "optional",
    format: "woff2-variations",
    outPrefix: "geist-sans",
  },
  {
    source:
      "node_modules/.bun/@fontsource+geist-mono@5.3.0/node_modules/@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff2",
    family: "Geist Mono",
    variable: false,
    weightCss: "400",
    fontDisplay: "swap",
    format: "woff2",
    outPrefix: "geist-mono",
  },
];

// ---------------------------------------------------------------------------
// 1. Collect the text the site can render.

const dumpPath = process.argv[2];
let contentText = "";
if (dumpPath) {
  const dump = JSON.parse(readFileSync(dumpPath, "utf8")) as {
    results?: Record<string, string | null>[];
  };
  const rows = dump.results ?? dump[0]?.results ?? [];
  contentText = rows.map((r) => Object.values(r ?? {}).join(" ")).join(" ");
  contentText = contentText.replace(/https?:\/\/\S+/g, " ");
} else {
  console.error("usage: bun scripts/optimize-fonts.ts <d1-content-dump.json>");
  process.exit(1);
}

let sourceText = "";
for (const root of ["apps/site/src", "packages/core/src"]) {
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (!/(node_modules|\.wrangler|dist|\.git|\.astro)/.test(full)) walk(full);
      } else if (/\.(astro|tsx|ts|css|mjs)$/.test(entry)) {
        sourceText += readFileSync(full, "utf8");
      }
    }
  };
  walk(root);
}
// Rough literal extraction keeps prose strings, drops code identifiers.
const literals = sourceText.match(/"[^"\n]{3,}"|'[^'\n]{3,}'|>[^<>{}\n]{2,}</g) ?? [];
const sourceProse = literals.join(" ").replace(/https?:\/\/\S+/g, " ");

const used = new Set<number>();
for (const ch of contentText + sourceProse) {
  const cp = ch.codePointAt(0);
  if (cp !== undefined && cp >= 0x20) used.add(cp);
}

// ---------------------------------------------------------------------------
// 2-3. Per font: used ∩ coverage, plus Latin-1 / Latin Ext-A kept when covered.

function coverage(path: string): Set<number> {
  const font = fontkitOpen(path);
  return new Set([...(font.characterSet as Set<number>)]);
}

function mergeRanges(sorted: number[]): string {
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  const flush = () => {
    if (start === undefined) return;
    ranges.push(
      start === prev ? `U+${start.toString(16)}` : `U+${start.toString(16)}-${prev.toString(16)}`,
    );
  };
  for (let i = 1; i < sorted.length; i++) {
    const cp = sorted[i];
    if (cp === prev + 1) {
      prev = cp;
    } else {
      flush();
      start = prev = cp;
    }
  }
  flush();
  return ranges.join(",");
}

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(join(CSS_PATH, ".."), { recursive: true });

const cssBlocks: string[] = [];

for (const spec of FONTS) {
  const covered = coverage(spec.source);

  // Everything the page could ask this font to render, that the font can
  // actually deliver (missing glyphs fall back to system fonts today — keep).
  const wanted = new Set<number>();
  for (const cp of used) if (covered.has(cp)) wanted.add(cp);
  // Core punctuation is kept even when unused: content can start using it any
  // day, it is covered today, and dropping it would change future rendering.
  for (const cp of CORE_EXTRA) if (covered.has(cp)) wanted.add(cp);
  // Latin-1 + Latin Extended-A, kept even when unused (when covered).
  for (let cp = 0x20; cp <= 0xff; cp++) if (covered.has(cp)) wanted.add(cp);
  for (let cp = 0x100; cp <= 0x17f; cp++) if (covered.has(cp)) wanted.add(cp);
  // Combining marks are never requested directly but can appear after any
  // character; keep the ones covered.
  for (const cp of covered) {
    if (
      (cp >= 0x300 && cp <= 0x36f) ||
      (cp >= 0x1ab0 && cp <= 0x1dff) ||
      (cp >= 0x20d0 && cp <= 0x20ff)
    ) {
      wanted.add(cp);
    }
  }

  const chars = [...wanted].sort((a, b) => a - b);

  // Split: core = ASCII printable + common punctuation + prose letters; the
  // rest (Latin-1 symbols, rare letters, combining marks) goes to ext.
  const inCore = (cp: number) =>
    (cp >= 0x20 && cp <= 0x7e) ||
    CORE_EXTRA.includes(cp) ||
    CORE_PROSE.some(([min, max]) => cp >= min && cp <= max);
  const coreSet = chars.filter(inCore);
  const extSet = chars.filter((cp) => !inCore(cp));

  const subsetOptions = {
    targetFormat: "woff2" as const,
    keepFeatures: KEEP_FEATURES,
    noHinting: true,
    dropTables: ["gasp"],
    preserveNameIds: [1, 2, 3, 4, 6, 7],
    ...(CLAMP_WGHT && spec.variable
      ? { variationAxes: { wght: { min: WGHT_MIN, max: WGHT_MAX } } }
      : {}),
  };
  const textOf = (set: number[]) => set.map((cp) => String.fromCodePoint(cp)).join("");

  const coreBuf = await subsetFont(readFileSync(spec.source), textOf(coreSet), subsetOptions);
  const extBuf = await subsetFont(readFileSync(spec.source), textOf(extSet), subsetOptions);

  const corePath = join(OUT_DIR, `${spec.outPrefix}-core.woff2`);
  const extPath = join(OUT_DIR, `${spec.outPrefix}-ext.woff2`);
  writeFileSync(corePath, coreBuf);
  writeFileSync(extPath, extBuf);

  // Verify what the generated files actually contain (tools have quirks).
  const verify = (path: string) => {
    const f = fontkitOpen(path);
    const set = [...(f.characterSet as Set<number>)].sort((a, b) => a - b);
    const axes = (f as unknown as { variationAxes?: Record<string, unknown> }).variationAxes ?? {};
    const features = (f as unknown as { availableFeatures?: string[] }).availableFeatures ?? [];
    return { set, axes, features, numGlyphs: f.numGlyphs };
  };
  const coreV = verify(corePath);
  const extV = verify(extPath);

  const lost = extSet.filter((cp) => !extV.set.includes(cp));
  const lostCore = coreSet.filter((cp) => !coreV.set.includes(cp));
  if (lost.length || lostCore.length) {
    console.error(
      `WARNING [${spec.family}]: characters dropped by the subsetter:`,
      [...lost, ...lostCore].map((cp) => `U+${cp.toString(16)}`).join(" "),
    );
  }
  // Characters the site uses that neither file nor fallback covers.
  const uncovered = [...used].filter((cp) => !wanted.has(cp));
  if (uncovered.length) {
    console.error(
      `NOTE [${spec.family}]: used characters not covered (system fallback, unchanged):`,
      uncovered
        .slice(0, 30)
        .map((cp) => `U+${cp.toString(16)} ${String.fromCodePoint(cp)}`)
        .join(" "),
    );
  }

  console.log(
    `${spec.family}: core ${coreSet.length} chars (${coreBuf.length} B), ext ${extSet.length} chars (${extBuf.length} B)`,
    `| axes ${JSON.stringify(coreV.axes)} | features ${(coreV.features ?? []).join(" ")}`,
  );

  cssBlocks.push(
    `/* ${spec.family} — core: ASCII + common punctuation. Preloaded by MainLayout. */
@font-face {
  font-family: "${spec.family}";
  font-style: normal;
  font-weight: ${spec.weightCss};
  font-display: ${spec.fontDisplay};
  src: url("/fonts/${spec.outPrefix}-core.woff2") format("${spec.format}");
  unicode-range: ${mergeRanges(coreV.set)};
}

/* ${spec.family} — extended: accents, symbols. Downloads only when a page
   needs one of these characters. */
@font-face {
  font-family: "${spec.family}";
  font-style: normal;
  font-weight: ${spec.weightCss};
  font-display: ${spec.fontDisplay};
  src: url("/fonts/${spec.outPrefix}-ext.woff2") format("${spec.format}");
  unicode-range: ${mergeRanges(extV.set)};
}`,
  );
}

writeFileSync(
  CSS_PATH,
  `/* Generated by scripts/optimize-fonts.ts. Do not edit by hand:
   rerun the script (see the script header for when). */\n\n${cssBlocks.join("\n\n")}\n`,
);

console.log(`wrote ${CSS_PATH}`);
