import { describe, expect, it } from "vitest";
import { parseArticleMirror, renderArticleMirror } from "@/lib/content-mirror";

const article = {
  slug: "le-secret-du-psaume-91",
  title: "Le Secret du Psaume 91",
  description: "Une étude du Psaume 91.",
  status: "published" as const,
  lang: "fr",
  publishedAt: "2026-07-04T00:00:00.000Z",
  updatedAt: "2026-09-06T00:00:00.000Z",
  imageKey: "images/psaume-91.webp",
  imageAlt: "Mosaïque de Ravenne",
  category: "bible",
  bodyMdx: "## Contexte\n\nUn texte.",
};

describe("content mirror", () => {
  it("round-trips an article through frontmatter", () => {
    const parsed = parseArticleMirror(renderArticleMirror(article));

    expect(parsed).toMatchObject({
      slug: article.slug,
      title: article.title,
      description: article.description,
      status: "published",
      lang: "fr",
      imageKey: article.imageKey,
      imageAlt: article.imageAlt,
      category: "bible",
    });
    expect(parsed.bodyMdx).toContain("## Contexte");
  });

  it("keeps drafts and missing images", () => {
    const parsed = parseArticleMirror(
      renderArticleMirror({ ...article, status: "draft", imageKey: null, imageAlt: null }),
    );

    expect(parsed.status).toBe("draft");
    expect(parsed.imageKey).toBeNull();
  });

  it("rejects a file without a title", () => {
    expect(() => parseArticleMirror("---\nslug: x\n---\n\nBody")).toThrow(/title/);
  });
});
