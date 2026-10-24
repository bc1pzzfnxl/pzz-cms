import { describe, expect, it } from "vitest";
import { prepareMdxHtml } from "@/lib/mdx-html";

const HIDDEN = 'style="opacity:0;transform:translateY(8px)"';

describe("prepareMdxHtml", () => {
  it("removes motion's hidden state", () => {
    const html = `<div ${HIDDEN}>Texte</div>`;
    expect(prepareMdxHtml(html)).toBe("<div>Texte</div>");
  });

  it("keeps unrelated inline styles", () => {
    const html = '<div style="opacity:0;transform:translateY(8px);color:red">Texte</div>';
    expect(prepareMdxHtml(html)).toBe('<div style="color:red">Texte</div>');
  });

  it("leaves other opacity values alone", () => {
    const html = '<div style="opacity:0.4">Texte</div>';
    expect(prepareMdxHtml(html)).toBe(html);
  });

  it("is idempotent", () => {
    const once = prepareMdxHtml(`<div ${HIDDEN}>Texte</div>`);
    expect(prepareMdxHtml(once)).toBe(once);
  });

  it("only strips the pair, not a lone opacity", () => {
    const html = '<div style="opacity:0">Texte</div>';
    expect(prepareMdxHtml(html)).toBe(html);
  });

  it("does not add a reveal marker", () => {
    expect(prepareMdxHtml(`<div ${HIDDEN}>Texte</div>`)).not.toContain("data-mdx-reveal");
  });

  it("drops reveal markers stored by older article revisions", () => {
    const html =
      '<div data-mdx-reveal="">A</div><span data-reveal="">B</span><p data-no-reveal>C</p>';
    expect(prepareMdxHtml(html)).toBe("<div>A</div><span>B</span><p>C</p>");
  });
});
