/**
 * Compare the old blog and the new CMS, URL by URL.
 *
 *   bun scripts/parity.ts <oldBase> <newBase> [sitemapPath]
 *
 * Example:
 *   bun scripts/parity.ts https://bc1pzzfnxl.com http://127.0.0.1:8787 /sitemap.xml
 *
 * It reads the sitemap of the old site, fetches each URL from both sites and
 * compares the status code, <title>, canonical link, <h1> and JSON-LD types.
 * Exits non-zero when any difference is found.
 */
import { compareFacts, extractPageFacts } from "../src/lib/parity";

const oldBase = (process.argv[2] ?? "https://bc1pzzfnxl.com").replace(/\/$/, "");
const newBase = (process.argv[3] ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const sitemapPath = process.argv[4] ?? "/sitemap.xml";

async function fetchText(url: string): Promise<{ status: number; text: string }> {
  const response = await fetch(url, { redirect: "manual" });
  const text = response.headers.get("content-type")?.includes("html") ? await response.text() : "";
  return { status: response.status, text };
}

const sitemapUrl = `${oldBase}${sitemapPath}`;

async function collectUrls(url: string, seen = new Set<string>()): Promise<string[]> {
  if (seen.has(url)) return [];
  seen.add(url);
  const xml = await (await fetch(url)).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  if (/<sitemapindex/i.test(xml)) {
    const nested = await Promise.all(locs.map((loc) => collectUrls(loc, seen)));
    return nested.flat();
  }
  return locs;
}

const urls = await collectUrls(sitemapUrl);
const paths = [...new Set(urls.map((url) => new URL(url).pathname))].sort();

console.log(`Comparing ${paths.length} URL(s): ${oldBase} vs ${newBase}\n`);

let problems = 0;

for (const path of paths) {
  const oldPage = await fetchText(`${oldBase}${path}`);
  const newPage = await fetchText(`${newBase}${path}`);

  if (oldPage.status !== newPage.status) {
    console.log(`✘ ${path}  status ${oldPage.status} -> ${newPage.status}`);
    problems += 1;
    continue;
  }

  const diffs = compareFacts(path, extractPageFacts(oldPage.text), extractPageFacts(newPage.text));
  if (diffs.length === 0) {
    console.log(`✓ ${path}`);
    continue;
  }

  problems += 1;
  for (const diff of diffs) {
    console.log(`✘ ${path}  ${diff.field}\n    old: ${diff.old}\n    new: ${diff.next}`);
  }
}

console.log(`\n${problems === 0 ? "Parity OK." : `${problems} URL(s) with differences.`}`);
process.exit(problems === 0 ? 0 : 1);
