import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { site } from "../../lib/site";
import type { AuthProvider } from "../types";

/**
 * Password provider (Better Auth). Portable: the database is the D1 binding
 * here, but the seam keeps it swappable for another host. There is no signup:
 * the owner chooses their password once at `/admin/setup`, and a hook refuses
 * any second account.
 */
function buildAuth() {
  const origin = env.BETTER_AUTH_URL ?? site.url;

  return betterAuth({
    baseURL: origin,
    secret: env.BETTER_AUTH_SECRET,
    // D1 binding. Better Auth ships a Kysely D1 dialect.
    database: env.DB as never,
    emailAndPassword: { enabled: true, disableSignUp: true },
    // Single owner is enforced by the setup endpoint: `disableSignUp` closes the
    // public route, and `createOwnerAccount` refuses when an owner exists.
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

/** Whether the single owner account already exists. */
export async function ownerExists(): Promise<boolean> {
  const auth = buildAuth();
  const ctx = await auth.$context;
  const users = await ctx.internalAdapter.listUsers(1);
  return users.length > 0;
}

/**
 * Create the single owner with the password chosen at setup. The password is
 * hashed by Better Auth and stored in D1; no password secret is involved.
 */
export async function createOwnerAccount(email: string, password: string): Promise<void> {
  const auth = buildAuth();
  const ctx = await auth.$context;
  const users = await ctx.internalAdapter.listUsers(1);
  if (users.length > 0) {
    throw new Error("OWNER_EXISTS");
  }

  const hash = await ctx.password.hash(password);
  const user = await ctx.internalAdapter.createUser(
    {
      id: crypto.randomUUID(),
      name: site.author.name,
      email,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { method: "setup" },
  );

  await ctx.internalAdapter.createAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: hash,
  });
}
