import { describe, expect, it } from "vitest";
import { mediaKeysInHtml, mediaObjectKey, mediaPublicPath, optimizeBodyImages } from "@/lib/media";

describe("mediaObjectKey", () => {
  it("builds an ASCII webp key from the file name", () => {
    expect(mediaObjectKey("Mon Image.PNG", "abc123")).toBe("images/mon-image-abc123.webp");
  });

  it("removes accents", () => {
    expect(mediaObjectKey("Forêt d'été.jpg", "x")).toBe("images/foret-dete-x.webp");
  });

  it("falls back to 'image' for an empty name", () => {
    expect(mediaObjectKey("!!!.png", "x")).toBe("images/image-x.webp");
  });
});

describe("mediaPublicPath", () => {
  it("prefixes the key with /media/ and a trailing slash", () => {
    expect(mediaPublicPath("images/a-x.webp")).toBe("/media/images/a-x.webp/");
  });
});

describe("mediaKeysInHtml", () => {
  it("collects the media keys referenced by img tags", () => {
    const html =
      '<p><img src="/media/images/a.webp/" alt="a"/></p><img src="/media/images/b.webp/">';
    expect(mediaKeysInHtml(html)).toEqual(["images/a.webp", "images/b.webp"]);
  });
});

describe("optimizeBodyImages", () => {
  it("adds dimensions and lazy loading", () => {
    const dimensions = new Map([["images/a.webp", { width: 800, height: 600 }]]);
    const html = optimizeBodyImages('<img src="/media/images/a.webp/" alt="a"/>', dimensions);
    expect(html).toContain('width="800"');
    expect(html).toContain('height="600"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
  });

  it("keeps existing attributes and leaves unknown images untouched", () => {
    const html = optimizeBodyImages('<img src="/other/x.png" loading="eager"/>', new Map());
    expect(html).toContain('loading="eager"');
    expect(html).not.toContain("width=");
  });
});
