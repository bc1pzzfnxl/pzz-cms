import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "@/lib/slug";

describe("slugify", () => {
  it("removes accents and lowercases", () => {
    expect(slugify("Le Mystère de Barabbas")).toBe("le-mystere-de-barabbas");
  });

  it("produces pure ASCII kebab-case", () => {
    expect(slugify("Café, thé & Torah !")).toBe("cafe-the-torah");
  });

  it("drops apostrophes without a dash", () => {
    expect(slugify("L'appel d'Abraham")).toBe("lappel-dabraham");
  });

  it("collapses separators and trims dashes", () => {
    expect(slugify("  --Hello   World--  ")).toBe("hello-world");
  });

  it("handles an empty result", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("returns the base when it is free", () => {
    expect(uniqueSlug("hello", [])).toBe("hello");
  });

  it("appends a counter when taken", () => {
    expect(uniqueSlug("hello", ["hello"])).toBe("hello-2");
    expect(uniqueSlug("hello", ["hello", "hello-2"])).toBe("hello-3");
  });

  it("falls back to 'article' for an empty base", () => {
    expect(uniqueSlug("", [])).toBe("article");
  });
});
