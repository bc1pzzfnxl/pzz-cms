/**
 * Measure rendered text widths under the currently-loaded site fonts.
 * Usage: bun scripts/font-measure.ts
 * Requires the dev server on :4321.
 */
import { chromium } from "@playwright/test";

const SAMPLES = [
  [
    "Première présence chrétienne au sein des Kurdes",
    "font-weight:600;font-size:36px;letter-spacing:-0.02em",
  ],
  [
    "Si ces trois missionnaires ont évangélisé des territoires intégrés aujourd'hui à l'aire kurde",
    "",
  ],
  ["Example", ""],
  ["Articles", ""],
  ["25 octobre 2026", ""],
  ["Kurde et Christianisme", ""],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

for (const [text, extra] of SAMPLES) {
  const width = await page.evaluate(
    ({ t, e }) => {
      const span = document.createElement("span");
      span.textContent = t;
      span.style.cssText = `position:absolute;white-space:nowrap;visibility:hidden;font-family:var(--body-font);font-size:18px;${e}`;
      document.body.appendChild(span);
      const w = span.getBoundingClientRect().width;
      span.remove();
      return w;
    },
    { t: text, e: extra },
  );
  console.log(`${width.toFixed(2)}px  ${text.slice(0, 60)}`);
}
await browser.close();
