import { fileURLToPath } from "node:url";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
  // Astro sessions are unused: no KV SESSION binding, which also keeps
  // `wrangler dev --remote` happy (remote mode requires an id).
  session: false,
  // Astro's built-in checkOrigin compares the Origin header to request.url,
  // which in `wrangler dev --remote` is the remote preview URL, not the
  // localhost address the browser talks to. The same check is re-implemented
  // against loopback origins in src/middleware.ts (ADR 0008: the CMS app is
  // local-only).
  security: { checkOrigin: false },
  adapter: cloudflare({
    // The local CMS can build against a deployment's real ids via a
    // gitignored wrangler.local.jsonc (CMS_WRANGLER_CONFIG env var).
    configPath: process.env.CMS_WRANGLER_CONFIG ?? "wrangler.jsonc",
  }),
  trailingSlash: "ignore",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
