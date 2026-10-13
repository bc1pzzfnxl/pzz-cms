import { defineMiddleware } from "astro:middleware";
import { getAuthProvider } from "./auth";

/**
 * Protect the admin. The login and setup pages stay public so a session can be
 * obtained.
 *
 * The auth API is handled here, before Astro routing: `trailingSlash: "always"`
 * would otherwise 301 the auth endpoints and break the Better Auth routes.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (pathname.startsWith("/api/auth")) {
    const response = await getAuthProvider().handle(context.request);
    return response ?? new Response("Not found", { status: 404 });
  }

  // Canonicalize page URLs to the trailing-slash form (trailingSlash is
  // "ignore" so the auth API is not redirected). Files and assets are left
  // alone.
  const isAsset = pathname.startsWith("/_") || pathname.startsWith("/media/");
  const lastSegment = pathname.split("/").pop() ?? "";
  const looksLikeFile = lastSegment.includes(".");
  const isRead = context.request.method === "GET" || context.request.method === "HEAD";
  if (isRead && !isAsset && !looksLikeFile && !pathname.endsWith("/")) {
    const url = new URL(context.request.url);
    return context.redirect(`${pathname}/${url.search}`, 301);
  }

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isPublicAdmin = pathname.startsWith("/admin/login") || pathname.startsWith("/admin/setup");
  if (!isAdmin || isPublicAdmin) {
    return next();
  }

  let session = null;
  try {
    session = await getAuthProvider().getSession(context.request);
  } catch {
    // Tables not created yet, or a transient failure: treat as unauthenticated.
    session = null;
  }
  if (session) {
    context.locals.session = session;
    return next();
  }

  if (pathname.startsWith("/admin/api/")) {
    return new Response(JSON.stringify({ error: "Non authentifié." }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  return context.redirect("/admin/login");
});
