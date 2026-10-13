import type { AuthProvider } from "../types";

/**
 * Cloudflare Access adapter. Access enforces authentication at the edge; the
 * Worker only reads the headers Access injects. Kept as an option for
 * Cloudflare deployments (the portable default is the passkey provider).
 */
export function createAccessProvider(): AuthProvider {
  return {
    async getSession(request) {
      const email = request.headers.get("cf-access-authenticated-user-email");
      const jwt = request.headers.get("cf-access-jwt-assertion");
      if (!jwt) return null;
      return { userId: email ?? "access-user", email: email ?? "access-user" };
    },
    async handle() {
      return null;
    },
  };
}
