import type { Page } from "@playwright/test";

/**
 * The public site worker, booted separately from the CMS worker. The CMS specs
 * read their articles back from here (the CMS app has no public routes), so
 * both workers must share the same local D1 state directory.
 */
export const SITE_BASE_URL = process.env.SITE_BASE_URL ?? "http://127.0.0.1:8787";

/** Open a public page on the site worker from a CMS test. */
export async function gotoPublic(page: Page, path: string) {
  await page.goto(`${SITE_BASE_URL}${path}`);
}

/** GET a public URL on the site worker. */
export function publicRequest(page: Page, path: string) {
  return page.request.get(`${SITE_BASE_URL}${path}`);
}
