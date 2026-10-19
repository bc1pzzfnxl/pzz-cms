import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, ensureOwner, signInWithPassword } from "./helpers";

const NEW_PASSWORD = "ci-new-password-9876543210";

test("the admin is protected without a session", async ({ page }) => {
  await page.goto("/admin/");
  await expect(page).toHaveURL(/\/admin\/login\/?$/);
});

test("sign in with the password", async ({ page }) => {
  await signInWithPassword(page);
  await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();
});

test("a wrong password is rejected", async ({ page }) => {
  await ensureOwner(page);

  await page.goto("/admin/login/");
  await page.getByTestId("email").fill(ADMIN_EMAIL);
  await page.getByTestId("password").fill("wrong-password");
  await page.getByTestId("password-signin").click();

  await expect(page.getByTestId("error")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("changing the password keeps the session, then restores it", async ({ page }) => {
  await signInWithPassword(page);
  await page.goto("/admin/password/");

  async function change(from: string, to: string) {
    await page.getByTestId("current-password").fill(from);
    await page.getByTestId("new-password").fill(to);
    await page.getByTestId("confirm-password").fill(to);
    await page.getByTestId("change-password").click();
    await expect(page.getByTestId("password-success")).toBeVisible();
  }

  await change(ADMIN_PASSWORD, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/admin\/password\/?$/);
  await change(NEW_PASSWORD, ADMIN_PASSWORD);
});
