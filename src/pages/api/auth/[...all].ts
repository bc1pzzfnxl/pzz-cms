import type { APIRoute } from "astro";
import { getAuthProvider } from "@/auth";

export const ALL: APIRoute = async (context) => {
  const response = await getAuthProvider().handle(context.request);
  return response ?? new Response("Not found", { status: 404 });
};
