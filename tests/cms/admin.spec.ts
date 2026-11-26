import { expect, type Page, test } from "@playwright/test";
import { gotoPublic, publicRequest } from "../helpers";

/** Save a new article and return the editor URL once the app navigates to it. */
async function saveNewArticle(page: Page): Promise<string> {
  await page.getByTestId("save").click();
  await page.waitForURL(/\/admin\/[0-9a-f-]{36}\/?$/, { timeout: 30_000 });
  return page.url();
}

/** Publish the open article, wait for the API, then for the admin redirect. */
async function publish(page: Page) {
  const published = page.waitForResponse(
    (response) => response.url().includes("/status/") && response.status() === 200,
  );
  await page.getByTestId("publish").click();
  await published;
  // The editor navigates back to the articles list after a status change;
  // wait for it before the test issues its own navigation.
  await page.waitForURL(/\/admin\/articles\/?$/, { timeout: 30_000 });
}

test("create, publish and read back an article", async ({ page }) => {
  await page.goto("/admin/articles/");
  await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();

  await page.getByRole("link", { name: "New article" }).click();
  await expect(page).toHaveURL(/\/admin\/new\/?$/);

  await page.getByTestId("title").fill("Article de test E2E");
  await page.getByTestId("description").fill("Un article créé par le test de bout en bout.");

  const editor = page.locator('[data-testid="body-editor"] [contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type("Bonjour depuis le test.");
  await expect(editor).toContainText("Bonjour");

  await saveNewArticle(page);
  await publish(page);

  await gotoPublic(page, "/article-de-test-e2e/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Article de test E2E");
  await expect(page.locator("article")).toContainText("Bonjour depuis le test.");
});

test("a draft is not visible on the public site", async ({ page }) => {
  await page.goto("/admin/articles/");
  await page.getByRole("link", { name: "New article" }).click();

  await page.getByTestId("title").fill("Brouillon E2E");
  await saveNewArticle(page);

  const response = await publicRequest(page, "/brouillon-e2e/");
  expect(response.status()).toBe(404);
});

test("a stale save does not overwrite a newer one", async ({ page, browser }) => {
  await page.goto("/admin/articles/");
  await page.getByRole("link", { name: "New article" }).click();
  await page.getByTestId("title").fill("Revision E2E");
  await saveNewArticle(page);
  const editorUrl = page.url();

  // A second tab opens on the same revision.
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await secondPage.goto(editorUrl);

  // First tab saves: the revision moves on.
  await page.getByTestId("title").fill("Revision E2E first writer");
  const saved = page.waitForResponse(
    (response) => response.url().includes("/admin/api/articles/") && response.status() === 200,
  );
  await page.getByTestId("save").click();
  await saved;

  // The second tab still holds the old revision: the save is refused.
  await secondPage.getByTestId("title").fill("Revision E2E second writer");
  const rejected = secondPage.waitForResponse(
    (response) => response.url().includes("/admin/api/articles/") && response.status() === 409,
  );
  await secondPage.getByTestId("save").click();
  await rejected;
  await expect(secondPage.getByTestId("conflict")).toBeVisible();

  // The first writer's text survived.
  await page.reload();
  await expect(page.getByTestId("title")).toHaveValue("Revision E2E first writer");

  await secondContext.close();
});
