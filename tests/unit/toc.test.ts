import { TOC_MIN_HEADINGS, withHeadingIds } from "@pzz-cms/core";
import { describe, expect, it } from "vitest";

describe("withHeadingIds", () => {
  it("injects slug ids on h2 and h3 and returns entries", () => {
    const html = "<h2>Premier titre</h2><p>…</p><h3>Sous-titre</h3>";
    const { html: out, toc } = withHeadingIds(html);

    expect(out).toContain('<h2 id="premier-titre">Premier titre</h2>');
    expect(out).toContain('<h3 id="sous-titre">Sous-titre</h3>');
    expect(toc).toEqual([
      { id: "premier-titre", text: "Premier titre", level: 2 },
      { id: "sous-titre", text: "Sous-titre", level: 3 },
    ]);
  });

  it("suffixes duplicate slugs", () => {
    const html = "<h2>Introduction</h2><h2>Introduction</h2>";
    const { toc } = withHeadingIds(html);

    expect(toc.map((entry) => entry.id)).toEqual(["introduction", "introduction-2"]);
  });

  it("keeps an existing id and does not rewrite the tag", () => {
    const html = '<h2 id="custom-anchor">Déjà identifié</h2>';
    const { html: out, toc } = withHeadingIds(html);

    expect(out).toBe(html);
    expect(toc).toEqual([{ id: "custom-anchor", text: "Déjà identifié", level: 2 }]);
  });

  it("strips inline tags and unescapes entities in the TOC text", () => {
    const html = "<h2>De <em>l&#39;église</em> &amp; de l&#39;État</h2>";
    const { toc } = withHeadingIds(html);

    expect(toc[0].text).toBe("De l'église & de l'État");
  });

  it("ignores h1 and h4 headings", () => {
    const html = "<h1>Titre</h1><h2>Section</h2><h4>Détail</h4>";
    const { toc } = withHeadingIds(html);

    expect(toc).toHaveLength(1);
    expect(toc[0].level).toBe(2);
  });

  it("returns an empty toc when there is no heading", () => {
    const html = "<p>Un paragraphe sans titre.</p>";
    const { html: out, toc } = withHeadingIds(html);

    expect(out).toBe(html);
    expect(toc).toEqual([]);
  });

  it("exports a minimum headings threshold above one", () => {
    expect(TOC_MIN_HEADINGS).toBeGreaterThanOrEqual(2);
  });
});
