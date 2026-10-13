import { env } from "cloudflare:workers";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { site } from "../../lib/site";
import type { AuthProvider } from "../types";

/**
 * Passkey provider (Better Auth). Portable: the database is the D1 binding
 * here, but the seam keeps it swappable for another host. No signup; the owner
 * registers the first passkey through the one-shot setup route, guarded by
 * `SETUP_TOKEN`.
 */
function buildAuth() {
  const origin = env.BETTER_AUTH_URL ?? site.url;
  const ownerEmail = env.OWNER_EMAIL ?? site.author.name;

  return betterAuth({
    baseURL: origin,
    secret: env.BETTER_AUTH_SECRET,
    // D1 binding. Better Auth ships a Kysely D1 dialect.
    database: env.DB as never,
    emailAndPassword: { enabled: false },
    session: { expiresIn: 60 * 60 * 24 * 30 },
    advanced: {
      database: {
        generateId: () => crypto.randomUUID(),
        // The auth tables are created by the setup route; do not hard-fail
        // initialization when they are not there yet.
        validateSchema: false,
      },
    },
    plugins: [
      passkey({
        rpID: new URL(origin).hostname,
        rpName: site.name,
        origin,
        registration: {
          requireSession: false,
          resolveUser: async ({ context }) => {
            if (!env.SETUP_TOKEN || context !== env.SETUP_TOKEN) {
              throw new Error("Invalid setup token.");
            }
            return { id: "owner", name: site.author.name };
          },
          // The owner row must exist before the passkey is stored (foreign key).
          afterVerification: async ({ ctx, user }) => {
            const adapter = ctx.context.internalAdapter;
            if (!(await adapter.findUserById(user.id))) {
              await adapter.createUser(
                {
                  id: user.id,
                  name: user.name,
                  email: ownerEmail,
                  emailVerified: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                { method: "passkey" },
              );
            }
            return { userId: user.id };
          },
        },
      }),
    ],
  });
}

export function createBetterAuthProvider(): AuthProvider {
  const auth = buildAuth();

  return {
    async getSession(request) {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) return null;
      return { userId: session.user.id, email: session.user.email };
    },

    async handle(request) {
      const { pathname } = new URL(request.url);
      if (!pathname.startsWith("/api/auth")) return null;
      return auth.handler(request);
    },
  };
}

/** Create the Better Auth tables if they do not exist yet. */
export async function migrateAuthSchema(): Promise<{ created: string[]; added: string[] }> {
  const auth = buildAuth();
  const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);
  if (toBeCreated.length === 0 && toBeAdded.length === 0) {
    return { created: [], added: [] };
  }
  await runMigrations();
  return {
    created: toBeCreated.map((table) => table.table),
    added: toBeAdded.map((table) => table.table),
  };
}
