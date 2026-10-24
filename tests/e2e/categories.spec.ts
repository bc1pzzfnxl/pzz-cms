import { expect, test } from "@playwright/test";

test("a category page lists its published articles", async ({ page }) => {
  await page.goto("/categorie/theologie/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Théologie");
  await expect(page.getByRole("link", { name: "Premier article" })).toBeVisible();
  await expect(page.getByText("Second article")).toHaveCount(0);
});

test("an unknown category returns 404", async ({ page }) => {
  const response = await page.request.get("/categorie/inconnue/");
  expect(response.status()).toBe(404);
});
