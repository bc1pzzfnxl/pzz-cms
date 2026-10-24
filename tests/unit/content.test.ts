import { Database as Sqlite } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import type { Content } from "@/content";
import { createContent } from "@/content";
import { createBunDatabase } from "../helpers/bun-d1";

const MIGRATIONS = [
  "../../migrations/0001_init.sql",
  "../../migrations/0002_documents.sql",
  "../../migrations/0003_categories.sql",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

function applyMigration(sqlite: Sqlite, sql: string) {
  const cleaned = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  for (const statement of cleaned.split(";")) {
    const trimmed = statement.trim();
    if (trimmed) sqlite.run(trimmed);
  }
}

function seed(sqlite: Sqlite) {
  for (const migration of MIGRATIONS) applyMigration(sqlite, migration);
  sqlite
    .query(
      "INSERT INTO articles (id, slug, title, description, body_mdx, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      "1",
      "premier-article",
      "Premier article",
      "Résumé 1",
      "# Bonjour",
      "published",
      "2026-01-02T00:00:00Z",
    );
  sqlite
    .query(
      "INSERT INTO articles (id, slug, title, description, body_mdx, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      "2",
      "second-article",
      "Second article",
      "Résumé 2",
      "# Salut",
      "published",
      "2026-03-04T00:00:00Z",
    );
  sqlite
    .query(
      "INSERT INTO articles (id, slug, title, description, body_mdx, status) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run("3", "brouillon", "Brouillon", "Pas publié", "# Draft", "draft");
  sqlite
    .query("INSERT INTO redirects (from_path, to_path) VALUES (?, ?)")
    .run("/ancien-slug/", "/premier-article/");
  sqlite
    .query("INSERT INTO categories (id, slug, name, position) VALUES (?, ?, ?, ?)")
    .run("c1", "theologie", "Théologie", 0);
  sqlite.query("UPDATE articles SET category_id = ? WHERE id = ?").run("c1", "1");
}

describe("content module", () => {
  let content: Content;

  beforeEach(() => {
    const sqlite = new Sqlite(":memory:");
    seed(sqlite);
    content = createContent(createBunDatabase(sqlite));
  });

  it("lists only published articles, newest first", async () => {
    const posts = await content.listPublished();
    expect(posts.map((p) => p.slug)).toEqual(["second-article", "premier-article"]);
    expect(posts[0]).toMatchObject({
      slug: "second-article",
      title: "Second article",
      description: "Résumé 2",
    });
  });

  it("returns a published article by slug", async () => {
    const article = await content.getPublishedBySlug("premier-article");
    expect(article?.title).toBe("Premier article");
    expect(article?.status).toBe("published");
  });

  it("does not return a draft from the public read path", async () => {
    expect(await content.getPublishedBySlug("brouillon")).toBeNull();
  });

  it("returns a draft from the admin read path", async () => {
    const article = await content.getArticleBySlug("brouillon");
    expect(article?.status).toBe("draft");
  });

  it("returns null for an unknown slug", async () => {
    expect(await content.getPublishedBySlug("inconnu")).toBeNull();
  });

  it("resolves a redirect", async () => {
    expect(await content.getRedirect("/ancien-slug/")).toEqual({
      fromPath: "/ancien-slug/",
      toPath: "/premier-article/",
    });
    expect(await content.getRedirect("/jamais-vu/")).toBeNull();
  });
});

describe("content module — admin write path", () => {
  let content: Content;

  beforeEach(() => {
    const sqlite = new Sqlite(":memory:");
    seed(sqlite);
    content = createContent(createBunDatabase(sqlite));
  });

  it("creates a draft with a slug derived from the title", async () => {
    const article = await content.createArticle({ title: "Le Mystère de Barabbas" });
    expect(article.slug).toBe("le-mystere-de-barabbas");
    expect(article.status).toBe("draft");
    expect(article.publishedAt).toBeNull();
  });

  it("de-duplicates slugs on collision", async () => {
    const article = await content.createArticle({ title: "Premier article" });
    expect(article.slug).toBe("premier-article-2");
  });

  it("creates a published article with a publication date", async () => {
    const article = await content.createArticle({
      title: "Nouveau",
      status: "published",
      bodyMdx: "# Nouveau",
      bodyHtml: "<h1>Nouveau</h1>",
    });
    expect(article.status).toBe("published");
    expect(article.publishedAt).not.toBeNull();
    expect(await content.getPublishedBySlug(article.slug)).not.toBeNull();
  });

  it("updates fields and bumps updated_at", async () => {
    const created = await content.createArticle({ title: "Titre initial" });
    const updated = await content.updateArticle(created.id, {
      title: "Titre modifié",
      bodyHtml: "<p>Corps</p>",
    });
    expect(updated.title).toBe("Titre modifié");
    expect(updated.bodyHtml).toBe("<p>Corps</p>");
    expect(updated.updatedAt >= updated.createdAt).toBe(true);
  });

  it("publishes then unpublishes", async () => {
    const created = await content.createArticle({ title: "À publier" });
    const published = await content.setStatus(created.id, "published");
    expect(published.status).toBe("published");
    expect(published.publishedAt).not.toBeNull();

    const drafted = await content.setStatus(created.id, "draft");
    expect(drafted.status).toBe("draft");
    expect(await content.getPublishedBySlug(created.slug)).toBeNull();
  });

  it("lists drafts and published articles for the admin", async () => {
    const rows = await content.listAll();
    expect(rows).toHaveLength(3);
    expect(rows.some((row) => row.status === "draft")).toBe(true);
  });

  it("creates a 301 redirect when a published article's slug changes", async () => {
    const created = await content.createArticle({ title: "Ancien titre", status: "published" });
    const updated = await content.updateArticle(created.id, { slug: "nouveau-titre" });

    expect(updated.slug).toBe("nouveau-titre");
    expect(await content.getRedirect("/ancien-titre/")).toEqual({
      fromPath: "/ancien-titre/",
      toPath: "/nouveau-titre/",
    });
  });

  it("does not create a redirect for a draft", async () => {
    const created = await content.createArticle({ title: "Brouillon titre" });
    await content.updateArticle(created.id, { slug: "brouillon-renomme" });
    expect(await content.getRedirect("/brouillon-titre/")).toBeNull();
  });

  it("de-duplicates a slug on update", async () => {
    const created = await content.createArticle({ title: "Unique" });
    const updated = await content.updateArticle(created.id, { slug: "premier-article" });
    expect(updated.slug).toBe("premier-article-2");
  });

  it("re-points an existing redirect instead of chaining", async () => {
    const created = await content.createArticle({ title: "Chaine", status: "published" });
    await content.updateArticle(created.id, { slug: "chaine-2" });
    await content.updateArticle(created.id, { slug: "chaine-3" });

    expect(await content.getRedirect("/chaine/")).toEqual({
      fromPath: "/chaine/",
      toPath: "/chaine-3/",
    });
  });

  it("records media and reads it back", async () => {
    const media = await content.createMedia({
      r2Key: "images/a-x.webp",
      width: 800,
      height: 600,
      alt: "Une image",
    });

    expect(media).toMatchObject({
      r2Key: "images/a-x.webp",
      width: 800,
      height: 600,
      alt: "Une image",
    });
    expect(await content.getMediaByKey("images/a-x.webp")).toEqual(media);
    expect(await content.getMediaByKey("images/absent.webp")).toBeNull();
  });

  it("updates a media alt", async () => {
    await content.createMedia({ r2Key: "images/a-x.webp", width: 800, height: 600, alt: null });

    const media = await content.updateMediaAlt("images/a-x.webp", "Mosaïque de Ravenne");

    expect(media.alt).toBe("Mosaïque de Ravenne");
    expect((await content.getMediaByKey("images/a-x.webp"))?.alt).toBe("Mosaïque de Ravenne");
  });

  it("returns the category of a published article", async () => {
    const posts = await content.listPublished();

    expect(posts.find((post) => post.slug === "premier-article")?.category).toEqual({
      id: "c1",
      slug: "theologie",
      name: "Théologie",
    });
    expect(posts.find((post) => post.slug === "second-article")?.category).toBeNull();
  });

  it("creates, renames and deletes categories", async () => {
    const created = await content.createCategory({ name: "Histoire" });
    expect(created.slug).toBe("histoire");
    expect(created.position).toBe(1);

    const renamed = await content.updateCategory(created.id, { name: "Histoire ancienne" });
    expect(renamed.name).toBe("Histoire ancienne");

    await content.deleteCategory("c1");
    expect((await content.listCategories()).map((category) => category.slug)).toEqual(["histoire"]);

    const posts = await content.listPublished();
    expect(posts.find((post) => post.slug === "premier-article")?.category).toBeNull();
  });
});
