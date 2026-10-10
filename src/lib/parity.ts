/**
 * Parity helpers. During migration, every URL in the old blog's sitemap is
 * fetched from both the old site and the new one, and the pages are compared
 * (status is checked by the caller). See PLAN.md, phase P6.
 */

export interface PageFacts {
  title: string | null;
  canonical: string | null;
  h1: string | null;
  jsonLdTypes: string[];
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "").trim();
}

export function extractPageFacts(html: string): PageFacts {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1];
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];

  const jsonLdTypes = new Set<string>();
  for (const match of html.matchAll(
    /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const data = JSON.parse(match[1]);
      for (const item of Array.isArray(data) ? data : [data]) {
        if (item && typeof item === "object" && item["@type"])
          jsonLdTypes.add(String(item["@type"]));
      }
    } catch {
      // Ignore malformed JSON-LD; it is reported as a missing type.
    }
  }

  return {
    title: title ? stripTags(title) : null,
    canonical: canonical ?? null,
    h1: h1 ? stripTags(h1) : null,
    jsonLdTypes: [...jsonLdTypes].sort(),
  };
}

export interface PageDiff {
  url: string;
  field: string;
  old: string | null;
  next: string | null;
}

export function compareFacts(url: string, oldFacts: PageFacts, newFacts: PageFacts): PageDiff[] {
  const diffs: PageDiff[] = [];

  for (const field of ["title", "canonical", "h1"] as const) {
    if (oldFacts[field] !== newFacts[field]) {
      diffs.push({ url, field, old: oldFacts[field], next: newFacts[field] });
    }
  }

  const missingTypes = oldFacts.jsonLdTypes.filter((type) => !newFacts.jsonLdTypes.includes(type));
  if (missingTypes.length > 0) {
    diffs.push({
      url,
      field: "jsonLdTypes",
      old: oldFacts.jsonLdTypes.join(", "),
      next: `missing: ${missingTypes.join(", ")}`,
    });
  }

  return diffs;
}
