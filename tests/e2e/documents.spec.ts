import { expect, test } from "@playwright/test";
import { signInWithPassword } from "./helpers";

const SAMPLE = {
  meta: { titre: "Programme test", auteur: "LaJota", principes_directeurs: ["Principe A"] },
  themes: [
    {
      id: 1,
      nom: "Souveraineté",
      choix_explicites: { sortie: "Article 50" },
      a_confirmer: ["Qui audite ?"],
    },
  ],
  questions_pour_affiner: ["Question 1"],
};

test("upload a JSON document and render its page", async ({ page }) => {
  await signInWithPassword(page);

  await page.goto("/admin/documents/");
  await page.getByTestId("document-upload").setInputFiles({
    name: "mon-programme-politique.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(SAMPLE, null, 2)),
  });
  await page.waitForURL(/\/admin\/documents\/[0-9a-f-]{36}\/?$/);

  await page.goto("/mon-programme-politique/");
  await expect(page.getByRole("heading", { level: 1, name: "Programme test" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Themes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Souveraineté" })).toBeVisible();
  await expect(page.getByText("Article 50")).toBeVisible();
});
