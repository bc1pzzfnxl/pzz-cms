import { evaluate } from "@mdx-js/mdx";
import { type ComponentType, createElement, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

export type MdxComponent = ComponentType<{ children?: ReactNode } & Record<string, unknown>>;
export type MdxComponents = Record<string, MdxComponent>;

/**
 * Compile MDX source to a static HTML string.
 *
 * This runs in the browser (the admin), never on the Worker: Cloudflare Workers
 * block `new Function`, which the MDX compiler uses. The result is stored in
 * `body_html` (see ADR 0005).
 */
export async function renderMdxToHtml(
  source: string,
  components: MdxComponents = {},
): Promise<string> {
  const mod = await evaluate(source, { ...runtime, development: false });
  const MdxContent = mod.default as ComponentType<{ components?: MdxComponents }>;
  const html = renderToStaticMarkup(createElement(MdxContent, { components }));

  // React 19 emits a <link rel="preload"> for every image it renders. Body
  // images must never be preloaded (only the cover is, by MainLayout), so drop
  // them. See the SEO rules in skill-seo-astro.
  return html.replace(/<link[^>]*\brel="preload"[^>]*>/gi, "");
}
