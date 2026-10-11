import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { renderMdxToHtml } from "@/lib/render-mdx";

describe("renderMdxToHtml", () => {
  it("renders headings and paragraphs", async () => {
    const html = await renderMdxToHtml("# Bonjour\n\nUn paragraphe.");
    expect(html).toContain("<h1>Bonjour</h1>");
    expect(html).toContain("<p>Un paragraphe.</p>");
  });

  it("keeps emphasis", async () => {
    const html = await renderMdxToHtml("**gras** et *italique*");
    expect(html).toContain("<strong>gras</strong>");
    expect(html).toContain("<em>italique</em>");
  });

  it("renders a provided component", async () => {
    const Badge = ({ children }: { children?: ReactNode }) =>
      createElement("span", { className: "badge" }, children);

    const html = await renderMdxToHtml("<Badge>Nouveau</Badge>", { Badge });
    expect(html).toContain('<span class="badge">Nouveau</span>');
  });

  it("renders a curated mdxcn component", async () => {
    const { mdxComponents } = await import("@/lib/mdx-components");
    const html = await renderMdxToHtml(
      '<Callout type="tip">\n\nUn conseil utile.\n\n</Callout>',
      mdxComponents,
    );
    expect(html).toContain("Un conseil utile.");
    expect(html.length).toBeGreaterThan(40);
  });

  it("never preloads body images", async () => {
    const html = await renderMdxToHtml("![alt](/media/images/a.webp/)");
    expect(html).toContain("<img");
    expect(html).not.toContain("preload");
  });

  it("renders the Stat component with its value in the markup", async () => {
    const { mdxComponents } = await import("@/lib/mdx-components");
    const html = await renderMdxToHtml(
      '<Stat value={1204} format="compact" locale="en-US" />',
      mdxComponents,
    );
    expect(html).toContain("data-stat");
    expect(html).toContain('data-value="1204"');
    expect(html).toContain("1.2K");
  });

  it("renders the Reveal component with its text in the markup", async () => {
    const { mdxComponents } = await import("@/lib/mdx-components");
    const html = await renderMdxToHtml("<Reveal>Un texte révélé</Reveal>", mdxComponents);
    expect(html).toContain("data-reveal");
    expect(html).toContain("Un texte révélé");
  });
});
