import { defineMiddleware } from "astro:middleware";
import { getAuthProvider } from "./auth";

/**
 * Protect the admin. The login and setup pages, and the auth API, stay public
 * so a session can be obtained.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isPublicAdmin = pathname.startsWith("/admin/login") || pathname.startsWith("/admin/setup");
  const isAuthApi = pathname.startsWith("/api/auth");

  if (!isAdmin || isPublicAdmin || isAuthApi) {
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
