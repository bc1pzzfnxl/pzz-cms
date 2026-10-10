import { describe, expect, it } from "vitest";
import { compareFacts, extractPageFacts } from "@/lib/parity";

const OLD = `<!doctype html><html><head>
<title>Le Mystère | bc1pzzfnxl</title>
<link rel="canonical" href="https://bc1pzzfnxl.com/le-mystere-de-barabbas/">
<script type="application/ld+json">{"@type":"BlogPosting","headline":"x"}</script>
<script type="application/ld+json">{"@type":"BreadcrumbList"}</script>
</head><body><h1>Le Mystère de Barabbas</h1></body></html>`;

describe("extractPageFacts", () => {
  it("reads the title, canonical, h1 and JSON-LD types", () => {
    const facts = extractPageFacts(OLD);
    expect(facts.title).toBe("Le Mystère | bc1pzzfnxl");
    expect(facts.canonical).toBe("https://bc1pzzfnxl.com/le-mystere-de-barabbas/");
    expect(facts.h1).toBe("Le Mystère de Barabbas");
    expect(facts.jsonLdTypes).toEqual(["BlogPosting", "BreadcrumbList"]);
  });

  it("tolerates missing fields", () => {
    const facts = extractPageFacts("<html><body>nothing</body></html>");
    expect(facts.title).toBeNull();
    expect(facts.canonical).toBeNull();
    expect(facts.jsonLdTypes).toEqual([]);
  });
});

describe("compareFacts", () => {
  it("reports no difference for identical pages", () => {
    expect(compareFacts("/x/", extractPageFacts(OLD), extractPageFacts(OLD))).toEqual([]);
  });

  it("reports a changed title", () => {
    const next = OLD.replace("<title>Le Mystère | bc1pzzfnxl</title>", "<title>Autre</title>");
    const diffs = compareFacts("/x/", extractPageFacts(OLD), extractPageFacts(next));
    expect(diffs).toEqual([
      { url: "/x/", field: "title", old: "Le Mystère | bc1pzzfnxl", next: "Autre" },
    ]);
  });

  it("reports a missing JSON-LD type", () => {
    const next = OLD.replace(
      '<script type="application/ld+json">{"@type":"BreadcrumbList"}</script>',
      "",
    );
    const diffs = compareFacts("/x/", extractPageFacts(OLD), extractPageFacts(next));
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toMatchObject({
      field: "jsonLdTypes",
      old: "BlogPosting, BreadcrumbList",
      next: "missing: BreadcrumbList",
    });
  });

  it("allows added JSON-LD types", () => {
    const next = OLD.replace(
      "</head>",
      '<script type="application/ld+json">{"@type":"BreadcrumbList"}</script><script type="application/ld+json">{"@type":"FAQPage"}</script></head>',
    );
    expect(compareFacts("/x/", extractPageFacts(OLD), extractPageFacts(next))).toEqual([]);
  });
});
