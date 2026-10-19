import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, SETUP_TOKEN, signInWithPassword } from "./helpers";

test("the admin is protected without a session", async ({ page }) => {
  await page.goto("/admin/");
  await expect(page).toHaveURL(/\/admin\/login\/?$/);
});

test("sign in with the password", async ({ page }) => {
  await signInWithPassword(page);
  await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();
});

test("a wrong password is rejected", async ({ page }) => {
  await page.goto(`/admin/setup/?token=${encodeURIComponent(SETUP_TOKEN)}`);
  await page.context().clearCookies();

  await page.goto("/admin/login/");
  await page.getByTestId("email").fill(ADMIN_EMAIL);
  await page.getByTestId("password").fill("wrong-password");
  await page.getByTestId("password-signin").click();

  await expect(page.getByTestId("error")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
});
