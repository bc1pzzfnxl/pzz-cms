import { expect, test } from "@playwright/test";

test("create, publish and read back an article", async ({ page }) => {
  await page.goto("/admin/");
  await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();

  await page.getByRole("link", { name: "Nouvel article" }).click();
  await expect(page).toHaveURL(/\/admin\/new\/?$/);

  await page.getByTestId("title").fill("Article de test E2E");
  await page.getByTestId("description").fill("Un article créé par le test de bout en bout.");

  const editor = page.locator('[data-testid="body-editor"] [contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type("Bonjour depuis le test.");
  await expect(editor).toContainText("Bonjour");

  await page.getByTestId("save").click();
  await expect(page).toHaveURL(/\/admin\/[0-9a-f-]{36}\/?$/);

  await page.getByTestId("publish").click();
  await expect(page).toHaveURL(/\/admin\/?$/);

  await page.goto("/article-de-test-e2e/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Article de test E2E");
  await expect(page.locator("article")).toContainText("Bonjour depuis le test.");
});

test("a draft is not visible on the public site", async ({ page }) => {
  await page.goto("/admin/");
  await page.getByRole("link", { name: "Nouvel article" }).click();

  await page.getByTestId("title").fill("Brouillon E2E");
  await page.getByTestId("save").click();
  await expect(page).toHaveURL(/\/admin\/[0-9a-f-]{36}\/?$/);

  const response = await page.request.get("/brouillon-e2e/");
  expect(response.status()).toBe(404);
});
