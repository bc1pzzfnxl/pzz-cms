import { defineConfig } from "@playwright/test";

/**
 * E2E runs against built Workers served by `wrangler dev`. Locally that needs
 * the workerd runtime; in this project it runs in CI (see
 * .github/workflows/ci.yml).
 *
 * Two projects:
 * - `site` hits the public site worker (8787).
 * - `cms` hits the local admin worker (8788) and reads results back from the
 *   site worker through `SITE_BASE_URL` (both share one local D1 state dir).
 */
export default defineConfig({
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // The CMS specs mutate global state (articles, documents); running files in
  // parallel makes assertions race.
  workers: 1,
  reporter: "list",
  projects: [
    {
      name: "site",
      testDir: "./tests/site",
      use: {
        baseURL: process.env.PLAYWRIGHT_SITE_BASE_URL ?? "http://127.0.0.1:8787",
        trace: "on-first-retry",
      },
    },
    {
      name: "cms",
      testDir: "./tests/cms",
      use: {
        baseURL: process.env.PLAYWRIGHT_CMS_BASE_URL ?? "http://127.0.0.1:8788",
        trace: "on-first-retry",
      },
    },
  ],
});
