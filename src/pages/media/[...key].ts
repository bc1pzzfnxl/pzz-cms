import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params }) => {
  // `trailingSlash: "always"` can append a slash to the matched key; the R2 key
  // itself never ends with one.
  const key = (params.key ?? "").replace(/\/+$/, "");
  if (!key) return new Response("Not found", { status: 404 });

  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
    "cache-control": "public, max-age=31536000, immutable",
  });
  if (object.httpEtag) headers.set("etag", object.httpEtag);

  return new Response(object.body, { headers });
};
