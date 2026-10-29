import { defineMiddleware } from "astro:middleware";

/**
 * Canonicalize page URLs to the trailing-slash form (`trailingSlash` is
 * "ignore"). Files and assets are left alone.
 *
 * No security headers here: the public pages must stay frameable by the home
 * page's own hover preview iframe, and the deployed site never served them.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const isAsset = pathname.startsWith("/_") || pathname.startsWith("/media/");
  const lastSegment = pathname.split("/").pop() ?? "";
  const looksLikeFile = lastSegment.includes(".");
  const isRead = context.request.method === "GET" || context.request.method === "HEAD";
  if (isRead && !isAsset && !looksLikeFile && !pathname.endsWith("/")) {
    const url = new URL(context.request.url);
    return context.redirect(`${pathname}/${url.search}`, 301);
  }

  return next();
});
