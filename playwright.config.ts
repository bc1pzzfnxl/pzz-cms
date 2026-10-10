import { defineConfig } from "@playwright/test";

/**
 * E2E runs against a built Worker served by `wrangler dev`. Locally that needs
 * the workerd runtime; in this project it runs in CI (see .github/workflows/ci.yml).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8787",
    trace: "on-first-retry",
  },
});
