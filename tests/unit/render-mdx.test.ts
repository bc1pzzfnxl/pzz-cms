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
});
