/**
 * Font pixel-diff harness. Screenshots every page of the local site (seeded
 * with the deployment's real content) and records which font files each page
 * downloads. Run once with the baseline fonts, once with the optimized fonts,
 * then compare with scripts/font-diff-report.ts.
 *
 * Usage: bun scripts/font-pixel-diff.ts <outdir>
 * Requires: the dev server running on http://localhost:4321 (bun run dev,
 * local D1 seeded via scripts/font-seed.ts).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const outDir = process.argv[2] ?? "font-shots";
mkdirSync(outDir, { recursive: true });

const BASE = "http://localhost:4321";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "light",
});
const page = await context.newPage();

// Discover pages: home + every article/category link on the homepage.
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const links = await page.evaluate(() =>
  [...document.querySelectorAll("a")]
    .map((a) => (a as HTMLAnchorElement).pathname)
    .filter((p) => p !== "/" && p.startsWith("/") && !p.includes(".") && !p.startsWith("/admin")),
);
const paths = ["/", ...[...new Set(links)]];

const manifest: Record<string, { fonts: string[]; bytes: Record<string, number> }> = {};

for (const path of paths) {
  const fonts: string[] = [];
  const bytes: Record<string, number> = {};
  const listener = (response: { url(): string; body(): Promise<Buffer> }) => {
    const url = response.url();
    if (url.endsWith(".woff2") || url.endsWith(".woff")) {
      fonts.push(url.replace(BASE, ""));
      void response
        .body()
        .then((b) => {
          bytes[url.replace(BASE, "")] = b.length;
        })
        .catch(() => {});
    }
  };
  page.on("response", listener);
  const name =
    path === "/" ? "home" : path.replaceAll("/", "_").replace(/^_/, "").replace(/_$/, "") || "root";
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  // Force every font on the page to load (both unicode-range files) so
  // screenshots are complete, and record what loaded.
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true });
  page.off("response", listener);
  manifest[path] = { fonts: [...new Set(fonts)], bytes };
  console.log(path, "->", manifest[path].fonts.join(", ") || "no fonts");
}

await browser.close();
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`saved ${paths.length} screenshots to ${outDir}`);
