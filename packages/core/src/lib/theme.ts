/**
 * Site appearance: the palette the admin edits and the public layout injects
 * as CSS custom properties. Six tokens per mode, no typography (the font
 * pipeline owns that), no derived colours: everything else is mixed from
 * these at render time.
 */
export interface ThemePalette {
  /** Page background. */
  background: string;
  /** Body text. */
  text: string;
  /** Headings and the site title. */
  heading: string;
  /** Secondary text: dates, captions, breadcrumb, footer. */
  muted: string;
  /** Borders, table rules, separators. */
  border: string;
  /** Links (the hover state inverts text and background). */
  link: string;
}

export interface SiteTheme {
  light: ThemePalette;
  dark: ThemePalette;
}

/** The colours the site shipped with before the theme editor existed. */
export const DEFAULT_THEME: SiteTheme = {
  light: {
    background: "#ffffff",
    text: "#374151",
    heading: "#111111",
    muted: "#6b7280",
    border: "#e5e7eb",
    link: "#111111",
  },
  dark: {
    background: "#111111",
    text: "#d1d5db",
    heading: "#ffffff",
    muted: "#9ca3af",
    border: "#27272a",
    link: "#ffffff",
  },
};

export const THEME_PALETTE_KEYS = [
  "background",
  "text",
  "heading",
  "muted",
  "border",
  "link",
] as const;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Strict `#rrggbb` check: the only accepted colour format. */
export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

function normalizePalette(input: unknown, fallback: ThemePalette): ThemePalette {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const palette = { ...fallback };
  for (const key of THEME_PALETTE_KEYS) {
    if (isHexColor(source[key])) palette[key] = source[key];
  }
  return palette;
}

/**
 * Merge an untrusted value (JSON stored in D1, request body) onto the
 * defaults: unknown keys and invalid colours are dropped instead of failing,
 * so a partially written theme still renders.
 */
export function normalizeTheme(input: unknown): SiteTheme {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    light: normalizePalette(source.light, DEFAULT_THEME.light),
    dark: normalizePalette(source.dark, DEFAULT_THEME.dark),
  };
}

/** True when the theme is identical to the shipped defaults. */
export function isDefaultTheme(theme: SiteTheme): boolean {
  for (const mode of ["light", "dark"] as const) {
    for (const key of THEME_PALETTE_KEYS) {
      if (theme[mode][key].toLowerCase() !== DEFAULT_THEME[mode][key].toLowerCase()) {
        return false;
      }
    }
  }
  return true;
}
