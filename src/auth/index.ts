import { env } from "cloudflare:workers";
import { createAccessProvider } from "./providers/access";
import { createBetterAuthProvider } from "./providers/better-auth";
import { createNoneProvider } from "./providers/none";
import type { AuthProvider } from "./types";

export type { AuthProvider, AuthSession } from "./types";

/** Select the auth provider from `AUTH_PROVIDER` (default: `passkey`). */
export function getAuthProvider(): AuthProvider {
  switch (env.AUTH_PROVIDER) {
    case "none":
      return createNoneProvider();
    case "access":
      return createAccessProvider();
    default:
      return createBetterAuthProvider();
  }
}
