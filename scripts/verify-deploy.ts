/**
 * Post-deploy verification: the site must actually answer.
 *
 *   bun scripts/verify-deploy.ts <baseUrl>
 *
 * Fetches the home page, the RSS feed and one article URL taken from the
 * sitemap, and exits non-zero on any failure. Run it right after
 * `wrangler deploy`: a broken worker (error 1101 and friends) fails the
 * deploy script instead of being discovered later.
 */
const RETRIES = 3;
const RETRY_DELAY_MS = 5000;

/** Extract every <loc> URL from a sitemap XML document. */
export function parseSitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

/** Pick the first sitemap URL that is not the site root. */
export function pickSitemapPage(locs: string[], baseUrl: string): string | null {
  const root = new URL(baseUrl).href;
  return locs.find((loc) => loc !== root && !loc.endsWith("/rss.xml")) ?? null;
}

function fail(message: string): never {
  console.error(`verify-deploy: FAIL — ${message}`);
  process.exit(1);
}

async function fetchWithRetry(
  url: string,
  expect: (status: number, body: string) => string | null,
): Promise<string> {
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      const body = await res.text();
      const problem = expect(res.status, body);
      if (!problem) return body;
      console.error(`verify-deploy: ${problem} (attempt ${attempt}/${RETRIES})`);
    } catch (error) {
      console.error(
        `verify-deploy: ${url} unreachable (${error instanceof Error ? error.message : String(error)}) (attempt ${attempt}/${RETRIES})`,
      );
    }
    if (attempt < RETRIES) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }
  fail(`all ${RETRIES} attempts against ${url} failed`);
}

if (import.meta.main) {
  const baseUrl = process.argv[2];
  if (!baseUrl) {
    console.error("usage: bun scripts/verify-deploy.ts <baseUrl>");
    process.exit(1);
  }
  const base = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

  console.log(`verify-deploy: checking ${base.href}`);

  await fetchWithRetry(base.href, (status, body) => {
    if (status !== 200) return `home returned ${status}`;
    if (!/<h1[\s>]/.test(body)) return "home has no <h1>";
    return null;
  });
  console.log("verify-deploy: home OK");

  await fetchWithRetry(new URL("rss.xml", base).href, (status, body) => {
    if (status !== 200) return `rss.xml returned ${status}`;
    if (!body.includes("<rss")) return "rss.xml is not an RSS document";
    return null;
  });
  console.log("verify-deploy: rss.xml OK");

  const sitemapIndex = await fetchWithRetry(new URL("sitemap-index.xml", base).href, (status) =>
    status === 200 ? null : `sitemap-index.xml returned ${status}`,
  );
  const sitemapLoc = parseSitemapLocs(sitemapIndex).at(-1);
  if (!sitemapLoc) fail("sitemap-index.xml contains no sitemap");
  const sitemap = await fetchWithRetry(sitemapLoc, (status) =>
    status === 200 ? null : `${sitemapLoc} returned ${status}`,
  );
  const page = pickSitemapPage(parseSitemapLocs(sitemap), base.href);
  if (!page) fail("sitemap contains no page URL besides the root");

  const article = await fetchWithRetry(page, (status, body) => {
    if (status !== 200) return `article ${page} returned ${status}`;
    if (!body.includes("application/ld+json")) {
      return `article ${page} has no JSON-LD schema`;
    }
    return null;
  });
  console.log(`verify-deploy: article OK (${page})`);

  const imageCount = (article.match(/<img\b/g) ?? []).length;
  const sizedImages = (article.match(/<img\b[^>]*\bheight=/g) ?? []).length;
  console.log(
    `verify-deploy: all checks passed (home, rss.xml, sitemap, article; images ${sizedImages}/${imageCount} with height)`,
  );
}
