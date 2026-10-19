import type { Page } from "@playwright/test";

export const SETUP_TOKEN = process.env.SETUP_TOKEN ?? "ci-setup-token";
export const ADMIN_EMAIL = process.env.OWNER_EMAIL ?? "owner@example.com";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ci-admin-password-0123456789";

/**
 * Seed the owner (idempotent) and sign in with the password. Each test gets a
 * fresh context, so it authenticates itself.
 */
export async function signInWithPassword(page: Page): Promise<void> {
  await page.goto(`/admin/setup/?token=${encodeURIComponent(SETUP_TOKEN)}`);
  await page.context().clearCookies();
  await page.goto("/admin/login/");
  await page.getByTestId("email").fill(ADMIN_EMAIL);
  await page.getByTestId("password").fill(ADMIN_PASSWORD);
  await page.getByTestId("password-signin").click();
  await page.waitForURL(/\/admin\/?$/);
}
