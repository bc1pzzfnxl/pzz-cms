import { env } from "cloudflare:workers";
import { createContent, isHexColor, type SiteTheme, THEME_PALETTE_KEYS } from "@pzz-cms/core";
import type { APIRoute } from "astro";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const GET: APIRoute = async () => {
  const content = createContent(env.DB);
  return json(await content.getTheme());
};

export const PUT: APIRoute = async ({ request }) => {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return json({ error: "Corps JSON invalide." }, 400);
  }

  // Strict: a mistyped colour is an error, not a silent fallback.
  for (const mode of ["light", "dark"] as const) {
    const palette = body[mode];
    if (!palette || typeof palette !== "object") {
      return json({ error: `Palette « ${mode} » manquante.` }, 400);
    }
    for (const key of THEME_PALETTE_KEYS) {
      if (!isHexColor((palette as Record<string, unknown>)[key])) {
        return json({ error: `Couleur invalide : ${mode}.${key} (attendu #rrggbb).` }, 400);
      }
    }
  }

  const content = createContent(env.DB);
  return json(await content.saveTheme(body as unknown as SiteTheme));
};
