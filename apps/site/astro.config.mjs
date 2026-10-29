import { fileURLToPath } from "node:url";
import cloudflare from "@astrojs/cloudflare";
import { site } from "@pzz-cms/core";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import icon from "astro-icon";

export default defineConfig({
  site: site.url,
  output: "server",
  adapter: cloudflare(),
  trailingSlash: "ignore",
  integrations: [icon()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
