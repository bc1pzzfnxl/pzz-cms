import { describe, expect, it } from "vitest";
import { prepareMdxHtml } from "@/lib/mdx-html";

const HIDDEN = 'style="opacity:0;transform:translateY(8px)"';

describe("prepareMdxHtml", () => {
  it("replaces motion's hidden state with a reveal marker", () => {
    const html = `<div ${HIDDEN}>Texte</div>`;
    expect(prepareMdxHtml(html)).toBe('<div data-mdx-reveal="">Texte</div>');
  });

  it("keeps unrelated inline styles", () => {
    const html = '<div style="opacity:0;transform:translateY(8px);color:red">Texte</div>';
    expect(prepareMdxHtml(html)).toBe('<div style="color:red" data-mdx-reveal="">Texte</div>');
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
});
