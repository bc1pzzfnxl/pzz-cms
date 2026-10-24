import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

interface EdgeCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

/**
 * Serve a media object from R2.
 *
 * The response is cached at the edge (Cache API) so R2 is read at most once per
 * colo per object: image views cost cache reads, not R2 Class B operations.
 * This keeps usage inside the R2 free tier.
 */
export const GET: APIRoute = async ({ params, request }) => {
  // `trailingSlash: "always"` can append a slash to the matched key; the R2 key
  // itself never ends with one.
  const key = (params.key ?? "").replace(/\/+$/, "");
  if (!key) return new Response("Not found", { status: 404 });

  const cache = (caches as unknown as { default: EdgeCache }).default;
  const cacheKey = new Request(request.url, { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const object = await env.MEDIA.get(key);
  let found = object;
  let cacheable = Boolean(found);

  // A resized variant may not exist yet (images uploaded before variants were
  // generated). Fall back to the original rather than showing a broken image.
  if (!found) {
    const original = key.replace(/@\d+(\.[a-z0-9]+)$/i, "$1");
    if (original !== key) found = await env.MEDIA.get(original);
    cacheable = false;
  }

  if (!found) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "content-type": found.httpMetadata?.contentType ?? "application/octet-stream",
    "cache-control": "public, max-age=31536000, immutable",
  });
  if (found.httpEtag) headers.set("etag", found.httpEtag);

  const response = new Response(found.body, { headers });
  if (cacheable) await cache.put(cacheKey, response.clone());
  return response;
};
