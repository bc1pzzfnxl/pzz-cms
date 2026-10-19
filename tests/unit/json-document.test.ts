import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonDocumentView } from "@/components/documents/json-document";

const DATA = {
  meta: {
    titre: "Programme",
    auteur: "LaJota",
    principes_directeurs: ["Sortie de l'UE", "Subsidiarité"],
  },
  themes: [
    {
      id: 1,
      nom: "Souveraineté",
      choix_explicites: { sortie: "Article 50", monnaie: "Franc" },
      a_confirmer: ["Qui audite ?"],
    },
  ],
  questions_pour_affiner: ["Question 1"],
};

function render(data: unknown): string {
  return renderToStaticMarkup(createElement(JsonDocumentView, { data }));
}

describe("JsonDocumentView", () => {
  it("renders the meta header", () => {
    const html = render(DATA);
    expect(html).toContain("Programme");
    expect(html).toContain("LaJota");
    expect(html).toContain("Sortie de l&#x27;UE");
  });

  it("renders sections, cards and definition rows", () => {
    const html = render(DATA);
    expect(html).toContain("Themes");
    expect(html).toContain("Souveraineté");
    expect(html).toContain("Choix explicites");
    expect(html).toContain("Article 50");
    expect(html).toContain("<dl");
  });

  it("renders an array of strings as a list", () => {
    const html = render(DATA);
    expect(html).toContain("<ul");
    expect(html).toContain("Question 1");
  });

  it("escapes HTML in values", () => {
    const html = render({ meta: { titre: "<script>alert(1)</script>" } });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
