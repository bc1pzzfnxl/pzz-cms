import { env } from "cloudflare:workers";
import { resolveAuthProviderName } from "./provider-name";
import { createAccessProviderFromEnv } from "./providers/access";
import { createBetterAuthProvider } from "./providers/better-auth";
import { createNoneProvider } from "./providers/none";
import type { AuthProvider } from "./types";

export { type AuthProviderName, resolveAuthProviderName } from "./provider-name";
export type { AuthProvider, AuthSession } from "./types";

/** Select the auth provider from `AUTH_PROVIDER` (default: `password`). */
export function getAuthProvider(): AuthProvider {
  switch (resolveAuthProviderName(env.AUTH_PROVIDER, import.meta.env.DEV)) {
    case "none":
      return createNoneProvider();
    case "access":
      return createAccessProviderFromEnv();
    default:
      return createBetterAuthProvider();
  }
}
