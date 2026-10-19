import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { site } from "../../lib/site";
import type { AuthProvider } from "../types";

function ownerEmail(): string {
  return env.OWNER_EMAIL ?? `${site.author.name}@localhost`;
}

/**
 * Password provider (Better Auth). Portable: the database is the D1 binding
 * here, but the seam keeps it swappable for another host. No signup: the owner
 * is seeded once from `OWNER_EMAIL` + `ADMIN_PASSWORD`, and a hook refuses any
 * second account.
 */
function buildAuth() {
  const origin = env.BETTER_AUTH_URL ?? site.url;

  return betterAuth({
    baseURL: origin,
    secret: env.BETTER_AUTH_SECRET,
    // D1 binding. Better Auth ships a Kysely D1 dialect.
    database: env.DB as never,
    emailAndPassword: { enabled: true },
    databaseHooks: {
      user: {
        create: {
          // Single owner: never allow a second account.
          before: async (_user, ctx) => {
            if (!ctx) return false;
            const users = await ctx.context.internalAdapter.listUsers(1);
            return users.length === 0;
          },
        },
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 30 },
    advanced: {
      database: {
        generateId: () => crypto.randomUUID(),
        // The auth tables are created by the setup route; do not hard-fail
        // initialization when they are not there yet.
        validateSchema: false,
      },
    },
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

/**
 * Seed the single owner account from `OWNER_EMAIL` + `ADMIN_PASSWORD`.
 * Idempotent: a second signup is blocked by the hook.
 */
export async function ensureOwnerAccount(): Promise<void> {
  if (!env.ADMIN_PASSWORD) return;
  const auth = buildAuth();
  try {
    await auth.api.signUpEmail({
      body: {
        email: ownerEmail(),
        password: env.ADMIN_PASSWORD,
        name: site.author.name,
      },
    });
  } catch {
    // The owner already exists; password sign-in still works.
  }
}
