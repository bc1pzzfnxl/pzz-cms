import { describe, expect, it } from "vitest";
import { mediaObjectKey, mediaPublicPath } from "@/lib/media";

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
  it("prefixes the key with /media/", () => {
    expect(mediaPublicPath("images/a-x.webp")).toBe("/media/images/a-x.webp");
  });
});
