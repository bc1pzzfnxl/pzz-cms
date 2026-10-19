import type { Page } from "@playwright/test";

export const SETUP_TOKEN = process.env.SETUP_TOKEN ?? "ci-setup-token";
export const ADMIN_EMAIL = process.env.OWNER_EMAIL ?? "owner@example.com";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ci-admin-password-0123456789";

/**
 * Create the owner through the setup API (409 once it exists). The password is
 * chosen here; the server has no password secret.
 */
export async function ensureOwner(page: Page): Promise<void> {
  await page.request.post("/admin/api/setup", {
    data: { token: SETUP_TOKEN, email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
}

/** Ensure the owner exists, then sign in with the password. */
export async function signInWithPassword(page: Page): Promise<void> {
  await ensureOwner(page);
  await page.goto("/admin/login/");
  await page.getByTestId("email").fill(ADMIN_EMAIL);
  await page.getByTestId("password").fill(ADMIN_PASSWORD);
  await page.getByTestId("password-signin").click();
  await page.waitForURL(/\/admin\/?$/);
}
