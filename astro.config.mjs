import { fileURLToPath } from "node:url";
import cloudflare from "@astrojs/cloudflare";
import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import icon from "astro-icon";
import { rehypeOptimizedImages } from "./src/lib/rehype-optimized-images.ts";
import { site } from "./src/lib/site.ts";

export default defineConfig({
  site: site.url,
  output: "server",
  adapter: cloudflare(),
  trailingSlash: "ignore",
  markdown: {
    processor: unified({
      rehypePlugins: [rehypeOptimizedImages],
    }),
  },
  integrations: [mdx(), icon(), react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        debug: fileURLToPath(new URL("./src/debug-mock.js", import.meta.url)),
      },
    },
  },
});
