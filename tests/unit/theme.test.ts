import { DEFAULT_THEME, isDefaultTheme, isHexColor, normalizeTheme } from "@pzz-cms/core";
import { describe, expect, it } from "vitest";

describe("theme helpers", () => {
  it("accepts only strict #rrggbb colours", () => {
    expect(isHexColor("#1A2b3C")).toBe(true);
    expect(isHexColor("#fff")).toBe(false);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor("rgb(0,0,0)")).toBe(false);
    expect(isHexColor(null)).toBe(false);
  });

  it("falls back to the shipped defaults for an empty value", () => {
    expect(normalizeTheme(undefined)).toEqual(DEFAULT_THEME);
    expect(normalizeTheme("nope")).toEqual(DEFAULT_THEME);
  });

  it("merges partial palettes and drops invalid colours", () => {
    const theme = normalizeTheme({
      light: { background: "#fdf6e3", text: "red" },
      dark: { link: "#89b4fa" },
    });

    expect(theme.light.background).toBe("#fdf6e3");
    // Invalid colour keeps the default instead of breaking the render.
    expect(theme.light.text).toBe(DEFAULT_THEME.light.text);
    expect(theme.dark.link).toBe("#89b4fa");
    expect(theme.dark.heading).toBe(DEFAULT_THEME.dark.heading);
  });

  it("ignores unknown keys", () => {
    const theme = normalizeTheme({ light: { font: "Comic Sans" } });
    expect(theme).toEqual(DEFAULT_THEME);
  });

  it("detects the default theme", () => {
    expect(isDefaultTheme(DEFAULT_THEME)).toBe(true);
    expect(
      isDefaultTheme({
        ...DEFAULT_THEME,
        light: { ...DEFAULT_THEME.light, background: "#000000" },
      }),
    ).toBe(false);
  });
});
