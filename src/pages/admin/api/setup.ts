import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createOwnerAccount, migrateAuthSchema, ownerExists } from "@/auth/providers/better-auth";

interface SetupBody {
  token?: string;
  email?: string;
  password?: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * One-shot owner creation. Gated by `SETUP_TOKEN`; refuses a second account.
 * The password is chosen here and hashed by Better Auth, so there is no
 * password secret to manage.
 */
export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json()) as SetupBody;

  if (!env.SETUP_TOKEN || body.token !== env.SETUP_TOKEN) {
    return json({ error: "Lien d'installation invalide." }, 403);
  }

  const email = body.email?.trim();
  const password = body.password ?? "";
  if (!email || !password) {
    return json({ error: "Email et mot de passe requis." }, 400);
  }
  if (password.length < 12) {
    return json({ error: "Le mot de passe doit faire au moins 12 caractères." }, 400);
  }

  await migrateAuthSchema();
  if (await ownerExists()) {
    return json({ error: "Le compte existe déjà. Connecte-toi." }, 409);
  }

  await createOwnerAccount(email, password);
  return json({ ok: true }, 201);
};
