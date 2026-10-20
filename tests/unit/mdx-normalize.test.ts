import { describe, expect, it } from "vitest";
import { normalizeMdxJsx } from "@/lib/mdx-normalize";

const names = ["Verse", "Callout"];

describe("normalizeMdxJsx", () => {
  it("unescapes an opening component tag", () => {
    const input = String.raw`\<Verse reference\="Jean 3:16" version\="LSG">`;
    expect(normalizeMdxJsx(input, names)).toBe('<Verse reference="Jean 3:16" version="LSG">');
  });

  it("unescapes a closing component tag", () => {
    expect(normalizeMdxJsx(String.raw`\</Verse>`, names)).toBe("</Verse>");
  });

  it("drops the leading space entity", () => {
    expect(normalizeMdxJsx("&#x20; Car Dieu", names)).toBe("Car Dieu");
  });

  it("leaves unknown tags alone", () => {
    const input = String.raw`\<div class\="x">`;
    expect(normalizeMdxJsx(input, names)).toBe(input);
  });

  it("is idempotent", () => {
    const once = normalizeMdxJsx(String.raw`\<Callout type\="tip">`, names);
    expect(normalizeMdxJsx(once, names)).toBe(once);
  });
});
