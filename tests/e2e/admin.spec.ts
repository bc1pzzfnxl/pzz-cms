import { expect, test } from "@playwright/test";
import { signInWithPassword } from "./helpers";

// The admin is behind auth now: sign in before each test.
test.beforeEach(async ({ page }) => {
  await signInWithPassword(page);
});

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

test("changing a published slug creates a 301", async ({ page }) => {
  await page.goto("/admin/");
  await page.getByRole("link", { name: "Nouvel article" }).click();
  await page.getByTestId("title").fill("Article slug test");

  const editor = page.locator('[data-testid="body-editor"] [contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type("Corps de l'article.");

  await page.getByTestId("save").click();
  await expect(page).toHaveURL(/\/admin\/[0-9a-f-]{36}\/?$/);
  const editUrl = page.url();

  await page.getByTestId("publish").click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  expect((await page.request.get("/article-slug-test/")).status()).toBe(200);

  await page.goto(editUrl);
  await page.getByTestId("slug").fill("nouveau-slug");
  await page.getByTestId("save").click();
  await expect(page.getByTestId("message")).toContainText("Enregistré");

  const moved = await page.request.get("/article-slug-test/", { maxRedirects: 0 });
  expect(moved.status()).toBe(301);
  expect(moved.headers().location).toContain("/nouveau-slug/");
  expect((await page.request.get("/nouveau-slug/")).status()).toBe(200);
});

test("upload a cover: it becomes WebP and serves on the public page", async ({ page }) => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGM4YWMDRwzEcQAREhQBbrqBkwAAAABJRU5ErkJggg==",
    "base64",
  );

  await page.goto("/admin/");
  await page.getByRole("link", { name: "Nouvel article" }).click();
  await page.getByTestId("title").fill("Article avec image");

  const editor = page.locator('[data-testid="body-editor"] [contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type("Corps avec image.");

  await page.getByTestId("cover-input").setInputFiles({
    name: "cover.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(page.getByTestId("message")).toContainText("Image envoyée");

  await page.getByTestId("save").click();
  await expect(page).toHaveURL(/\/admin\/[0-9a-f-]{36}\/?$/);
  await page.getByTestId("publish").click();
  await expect(page).toHaveURL(/\/admin\/?$/);

  const article = await page.request.get("/article-avec-image/");
  expect(article.status()).toBe(200);
  const match = (await article.text()).match(/\/media\/images\/[^"']+\.webp\/?/);
  expect(match).not.toBeNull();

  const media = await page.request.get(match?.[0] as string);
  expect(media.status()).toBe(200);
  expect(media.headers()["content-type"]).toContain("image/webp");
});
