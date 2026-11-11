import { defineMiddleware } from "astro:middleware";

const FORM_TYPES = new Set([
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/plain",
]);

/**
 * Same-origin guard for form POSTs, replacing Astro's built-in checkOrigin
 * (disabled in astro.config.mjs).
 *
 * Astro compares the Origin header to request.url, which in
 * `wrangler dev --remote` is the remote preview URL — not the localhost
 * address the browser talks to — so every multipart POST (media upload)
 * would be rejected. The Host header is rewritten the same way.
 *
 * The CMS app is local-only (ADR 0008): the dev proxy binds to loopback and
 * the remote preview URL is token-gated, so the only legitimate clients are
 * the owner's browser on localhost. The guard therefore requires the Origin
 * to be a loopback host: a drive-by POST from a malicious website carries
 * the attacker's origin and is refused.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { request } = context;
  const contentType = (request.headers.get("content-type") ?? "").split(";")[0];
  if (!FORM_TYPES.has(contentType)) return next();

  const origin = request.headers.get("origin");
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    // Malformed origin is rejected.
  }
  const hostname = originHost?.split(":")[0] ?? "";
  const isLoopback = hostname === "localhost" || hostname === "127.0.0.1";
  if (!isLoopback) {
    return new Response("Cross-site POST form submissions are forbidden", {
      status: 403,
    });
  }

  return next();
});
