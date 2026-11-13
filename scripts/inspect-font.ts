/**
 * Inspect a font file: glyph count, variable axes, OpenType features, hinting
 * presence, and a per-block glyph census. Read-only; used by the fonts
 * optimization workflow (scripts/optimize-fonts.ts).
 *
 * Usage: bun scripts/inspect-font.ts <font.woff2> [...]
 */
import { statSync } from "node:fs";
import { type Font, openSync as fontkitOpenSync } from "fontkit";

function inspect(path: string) {
  const font: Font = fontkitOpenSync(path) as Font;
  const info: Record<string, unknown> = {
    file: path,
    bytes: statSync(path).size,
    family: font.postscriptName,
    fullName: font.fullName,
    numGlyphs: font.numGlyphs,
    axes: font.variationAxes ?? null,
    fvarInstances: (font as unknown as { namedVariations?: unknown }).namedVariations
      ? Object.keys(
          (font as unknown as { namedVariations: Record<string, unknown> }).namedVariations,
        ).slice(0, 8)
      : null,
  };

  // OpenType features from GSUB (fontkit exposes them via availableFeatures).
  info.features = (font as unknown as { availableFeatures?: string[] }).availableFeatures ?? [];

  // Hinting: TrueType `glyf` instructions or CFF
  const tables = (font as unknown as { directory?: { tables: Record<string, unknown> } }).directory
    ?.tables;
  info.tables = Object.keys(tables ?? {});
  const glyfTable = tables?.glyf as { instruction?: Buffer }[] | undefined;
  const hasGlyfHinting =
    Array.isArray(glyfTable) && glyfTable.some((g) => g.instruction && g.instruction.length > 0);
  info.hinting = hasGlyfHinting
    ? "TrueType instructions present"
    : tables?.["CFF "] || tables?.CFF2
      ? "CFF (no TrueType hinting tables)"
      : "none detected";

  // Character census: sample coverage by Unicode block.
  const supported = 0;
  void supported;
  const codepoints: number[] = [];
  // Iterate cmap through font.characterSet if available.
  const set = (font as unknown as { characterSet?: Set<number> }).characterSet;
  if (set) codepoints.push(...set);
  if (codepoints.length > 0) {
    const blocks: Record<string, number> = {};
    for (const cp of codepoints) {
      const block =
        cp <= 0x7f
          ? "ASCII"
          : cp <= 0xff
            ? "Latin-1"
            : cp <= 0x17f
              ? "Latin Ext-A/B"
              : cp <= 0x2ff
                ? "Spacing/IPA"
                : cp <= 0x36f || (cp >= 0x1ab0 && cp <= 0x1dff) || (cp >= 0x20d0 && cp <= 0x20ff)
                  ? "Combining"
                  : cp >= 0x2000 && cp <= 0x206f
                    ? "Punct/Space"
                    : cp >= 0x20a0 && cp <= 0x20cf
                      ? "Currency"
                      : cp >= 0x2100 && cp <= 0x214f
                        ? "Letterlike"
                        : cp >= 0x2190 && cp <= 0x2bff
                          ? "Arrows/Symbols"
                          : cp >= 0x0400 && cp <= 0x04ff
                            ? "Cyrillic"
                            : cp >= 0x0100 && cp <= 0x024f
                              ? "Latin Ext"
                              : cp >= 0x1e00 && cp <= 0x1eff
                                ? "Latin Ext Additional"
                                : cp >= 0x3000 && cp <= 0x9fff
                                  ? "CJK"
                                  : `U+${cp.toString(16).toUpperCase()}`;
      blocks[block] = (blocks[block] ?? 0) + 1;
    }
    info.cmapEntries = codepoints.length;
    info.blocks = Object.fromEntries(Object.entries(blocks).sort((a, b) => b[1] - a[1]));
    // Sample of non-ASCII codepoints.
    info.nonAsciiSample = codepoints
      .filter((cp) => cp > 0x7f)
      .slice(0, 40)
      .map((cp) => String.fromCodePoint(cp))
      .join("");
  }

  console.log(JSON.stringify(info, null, 2));
}

for (const path of process.argv.slice(2)) {
  inspect(path);
}
