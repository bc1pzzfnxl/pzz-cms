import { expect, test } from "@playwright/test";

test("the hover preview reloads after returning from an article", async ({ page }) => {
  await page.goto("/");

  const item = page.locator(".home-item").first();
  const iframe = page.locator(".home-item iframe").first();

  await item.hover();
  await expect(iframe).toHaveAttribute("src", /\/premier-article\//);

  await page.locator(".home-link").first().click();
  await page.waitForURL(/\/premier-article\/$/);

  await page.goBack();
  await page.waitForURL(/\/$/);

  await item.hover();
  await expect(iframe).toHaveAttribute("src", /\/premier-article\//);
  await expect(page.frameLocator(".home-item iframe").first().locator("h1")).toContainText(
    "Premier article",
  );
});
