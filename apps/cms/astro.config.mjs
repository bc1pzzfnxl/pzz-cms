import { fileURLToPath } from "node:url";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
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
