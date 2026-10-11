import { describe, expect, it } from "vitest";
import { formatNumber } from "@/lib/format-number";

describe("formatNumber", () => {
  it("formats a plain number with the locale", () => {
    expect(formatNumber(1204, { locale: "fr-FR" })).toBe("1\u202f204");
  });

  it("formats currency", () => {
    expect(
      formatNumber(1125.64, { format: "currency", currency: "EUR", locale: "fr-FR" }),
    ).toContain("€");
  });

  it("formats a percentage", () => {
    expect(formatNumber(0.0241, { format: "percent", locale: "en-US" })).toBe("2%");
  });

  it("formats compact notation", () => {
    expect(formatNumber(48200, { format: "compact", locale: "en-US" })).toBe("48K");
  });
});
