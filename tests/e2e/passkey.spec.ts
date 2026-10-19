import { expect, test } from "@playwright/test";
import { attachVirtualAuthenticator } from "./helpers";

const SETUP_TOKEN = process.env.SETUP_TOKEN ?? "ci-setup-token";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ci-admin-password-0123456789";

test("the admin is protected without a session", async ({ page }) => {
  await page.goto("/admin/");
  await expect(page).toHaveURL(/\/admin\/login\/?$/);
});

test("register a passkey, then sign in with it", async ({ page }) => {
  await attachVirtualAuthenticator(page);

  // Register through the one-shot setup route.
  await page.goto(`/admin/setup/?token=${encodeURIComponent(SETUP_TOKEN)}`);
  await page.getByTestId("passkey-register").click();
  await page.waitForURL(/\/admin\/?$/);
  await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();

  // Drop the session, the admin locks again.
  await page.context().clearCookies();
  await page.goto("/admin/");
  await expect(page).toHaveURL(/\/admin\/login\/?$/);

  // Sign in with the passkey registered above (same virtual authenticator).
  await page.getByTestId("passkey-signin").click();
  await page.waitForURL(/\/admin\/?$/);
  await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();
});

test("sign in with the password fallback", async ({ page }) => {
  // Visiting setup with a valid token seeds the owner (idempotent).
  await page.goto(`/admin/setup/?token=${encodeURIComponent(SETUP_TOKEN)}`);
  await page.context().clearCookies();

  await page.goto("/admin/login/");
  await page.getByTestId("password").fill(ADMIN_PASSWORD);
  await page.getByTestId("password-signin").click();
  await page.waitForURL(/\/admin\/?$/);
  await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();
});
