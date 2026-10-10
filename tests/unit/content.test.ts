import { Database as Sqlite } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import type { Content } from "@/content";
import { createContent } from "@/content";
import { createBunDatabase } from "../helpers/bun-d1";

const MIGRATION = readFileSync(new URL("../../migrations/0001_init.sql", import.meta.url), "utf8");

function seed(sqlite: Sqlite) {
  const sql = MIGRATION.split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  for (const statement of sql.split(";")) {
    const trimmed = statement.trim();
    if (trimmed) sqlite.run(trimmed);
  }
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
