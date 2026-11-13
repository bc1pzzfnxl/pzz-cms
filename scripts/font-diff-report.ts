/**
 * Compare the before/after font screenshots (scripts/font-pixel-diff.ts) and
 * report pixel differences. Usage: bun scripts/font-diff-report.ts <before> <after>
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const [beforeDir, afterDir] = process.argv.slice(2);
const files = readdirSync(beforeDir).filter((f) => f.endsWith(".png") && !f.endsWith(".diff.png"));
const report: Record<string, unknown> = {};
let anyDiff = false;

for (const file of files) {
  const a = PNG.sync.read(readFileSync(join(beforeDir, file)));
  const b = PNG.sync.read(readFileSync(join(afterDir, file)));
  if (a.width !== b.width || a.height !== b.height) {
    report[file] = { error: `size mismatch: ${a.width}x${a.height} vs ${b.width}x${b.height}` };
    anyDiff = true;
    continue;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  const pixels = a.width * a.height;
  report[file] = {
    changedPixels: changed,
    totalPixels: pixels,
    pct: Number(((changed / pixels) * 100).toFixed(4)),
    result: changed === 0 ? "IDENTICAL" : changed < 50 ? "negligible" : "DIFF",
  };
  if (changed > 0) {
    anyDiff = true;
    writeFileSync(join(afterDir, file.replace(".png", ".diff.png")), PNG.sync.write(diff));
  }
}

console.log(JSON.stringify(report, null, 2));
console.log(
  anyDiff ? "DIFFERENCES FOUND (diff pngs written to the after dir)" : "ALL PAGES PIXEL-IDENTICAL",
);
