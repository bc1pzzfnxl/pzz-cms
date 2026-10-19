import { env } from "cloudflare:workers";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { site } from "../../lib/site";
import type { AuthProvider } from "../types";

function ownerEmail(): string {
  return env.OWNER_EMAIL ?? `${site.author.name}@localhost`;
}

/**
 * Passkey provider (Better Auth), with an email/password fallback for machines
 * without a passkey. The database is the D1 binding here; the seam keeps it
 * swappable for another host. No signup: the owner is seeded once from
 * `OWNER_EMAIL` + `ADMIN_PASSWORD`, and the first passkey is registered through
 * the one-shot setup route, guarded by `SETUP_TOKEN`.
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
    plugins: [
      passkey({
        rpID: new URL(origin).hostname,
        rpName: site.name,
        origin,
        registration: {
          requireSession: false,
          resolveUser: async ({ ctx, context }) => {
            if (!env.SETUP_TOKEN || context !== env.SETUP_TOKEN) {
              throw new Error("Invalid setup token.");
            }
            const found = await ctx.context.internalAdapter.findUserByEmail(ownerEmail());
            if (found) return { id: found.user.id, name: found.user.name };
            return { id: "owner", name: site.author.name };
          },
          // The owner row must exist before the passkey is stored (foreign key).
          afterVerification: async ({ ctx, user }) => {
            const adapter = ctx.context.internalAdapter;
            let existing = await adapter.findUserById(user.id);
            if (!existing) {
              const found = await adapter.findUserByEmail(ownerEmail());
              existing = found?.user ?? null;
            }
            if (!existing) {
              existing = await adapter.createUser(
                {
                  id: user.id,
                  name: user.name,
                  email: ownerEmail(),
                  emailVerified: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                { method: "passkey" },
              );
            }
            return { userId: existing.id };
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

/**
 * Seed the single owner account from `OWNER_EMAIL` + `ADMIN_PASSWORD` so the
 * password fallback works. Idempotent: a second signup is blocked by the hook.
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
