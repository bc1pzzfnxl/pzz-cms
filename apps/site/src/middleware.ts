import { defineMiddleware } from "astro:middleware";

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  return new Response(response.body, { status: response.status, headers });
}

/**
 * Canonicalize page URLs to the trailing-slash form (`trailingSlash` is
 * "ignore"). Files and assets are left alone.
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

  return withSecurityHeaders(await next());
});
