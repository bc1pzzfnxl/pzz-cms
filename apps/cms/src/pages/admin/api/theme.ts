import { env } from "cloudflare:workers";
import { createContent, isHexColor, type SiteTheme, THEME_PALETTE_KEYS } from "@pzz-cms/core";
import type { APIRoute } from "astro";
import { apiOk, validationError } from "../../../lib/api";

export const GET: APIRoute = async () => {
  const content = createContent(env.DB);
  return apiOk(await content.getTheme());
};

export const PUT: APIRoute = async ({ request }) => {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return validationError([{ path: "body", message: "The request body must be a JSON object." }]);
  }

  // Strict: a mistyped colour is an error, not a silent fallback.
  const issues = [];
  for (const mode of ["light", "dark"] as const) {
    const palette = body[mode];
    if (!palette || typeof palette !== "object") {
      issues.push({ path: mode, message: `The ${mode} palette is missing.` });
      continue;
    }
    for (const key of THEME_PALETTE_KEYS) {
      if (!isHexColor((palette as Record<string, unknown>)[key])) {
        issues.push({
          path: `${mode}.${key}`,
          message: `Invalid colour for ${mode}.${key} (expected #rrggbb).`,
        });
      }
    }
  }
  if (issues.length > 0) return validationError(issues);

  const content = createContent(env.DB);
  return apiOk(await content.saveTheme(body as unknown as SiteTheme));
};
