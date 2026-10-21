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

  it("parses GFM tables", async () => {
    const html = await renderMdxToHtml("| A | B |\n| --- | --- |\n| 1 | 2 |");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<td>1</td>");
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

  it("never leaves motion's hidden state in precompiled HTML", async () => {
    const { mdxComponents } = await import("@/lib/mdx-components");
    const html = await renderMdxToHtml(
      `
<Callout type="note" title="NOTE">Un appel.</Callout>

<Quote by="Auteur">Une citation.</Quote>

<Steps title="ÉTAPES">
1. **Copier** la source

   Puis la coller.

2. *Enregistrer*
</Steps>

<Faq>
### Question ?

Réponse.
</Faq>

<GraphStat title="CHIFFRES">
- **860** livrés
- 4,100 copies
</GraphStat>

<GraphTable title="TABLEAU">
| Agent | Jetons |
| --- | --- |
| Un | 10 |
| Deux | 20 |
</GraphTable>

<GraphTimeline title="DATES">
- 12: début
- **18: aujourd'hui**
- *20: suite*
</GraphTimeline>

<Verse reference="Jean 3:16" version="LSG">Car Dieu a tant aimé le monde.</Verse>

<GraphCompare title="COMPARE">
| | A | B |
| --- | --- | --- |
| Oui | true | false |
</GraphCompare>
      `,
      mdxComponents,
    );

    expect(html).not.toContain("opacity:0");
    expect(html).toContain("data-mdx-reveal");
    expect(html).toContain("Un appel.");
    expect(html).toContain("Une citation.");
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

  it("renders a Verse with its reference, version and text", async () => {
    const { mdxComponents } = await import("@/lib/mdx-components");
    const html = await renderMdxToHtml(
      '<Verse reference="Jean 3:16" version="LSG">\n\nCar Dieu a tant aimé le monde.\n\n</Verse>',
      mdxComponents,
    );

    expect(html).toContain("data-verse");
    expect(html).toContain("Jean 3:16");
    expect(html).toContain("LSG");
    expect(html).toContain("Car Dieu a tant aimé le monde.");
    expect(html).not.toContain("opacity:0");
  });

  it("renders a Verse original text and its label", async () => {
    const { mdxComponents } = await import("@/lib/mdx-components");
    const html = await renderMdxToHtml(
      '<Verse reference="Psaume 12:2" original="הוֹשִׁיעָה יְהוָה" originalLabel="Hébreu">\n\nSauve, Éternel !\n\n</Verse>',
      mdxComponents,
    );

    expect(html).toContain("Hébreu");
    expect(html).toContain("הוֹשִׁיעָה יְהוָה");
    expect(html).toContain("Sauve, Éternel !");
    expect(html).toContain('dir="auto"');
  });

  it("renders a Figure with a caption and a credit", async () => {
    const { mdxComponents } = await import("@/lib/mdx-components");
    const html = await renderMdxToHtml(
      '<Figure src="/media/images/test.webp/" alt="Une image" caption="Une légende" credit="Source" />',
      mdxComponents,
    );

    expect(html).toContain("data-figure");
    expect(html).toContain('src="/media/images/test.webp/"');
    expect(html).toContain('alt="Une image"');
    expect(html).toContain("Une légende");
    expect(html).toContain("Source");
    expect(html).not.toContain("opacity:0");
  });

  it("renders a GraphCompare with check and dash cells", async () => {
    const { mdxComponents } = await import("@/lib/mdx-components");
    const html = await renderMdxToHtml(
      `<GraphCompare title="COMPARE">\n| | A | B |\n| --- | --- | --- |\n| Oui | true | false |\n| Non | false | true |\n</GraphCompare>`,
      mdxComponents,
    );

    expect(html).toContain("graph-frame");
    expect(html).toContain("[ COMPARE ]");
    expect(html).toContain("✓");
    expect(html).toContain("–");
    expect(html).not.toContain("opacity:0");
  });
});
