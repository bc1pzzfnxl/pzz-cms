import type { AuthProvider } from "../types";

/**
 * No-auth provider, for local development only. Never select it in production.
 */
export function createNoneProvider(): AuthProvider {
  return {
    async getSession() {
      return { userId: "dev", email: "dev@localhost" };
    },
    async handle() {
      return null;
    },
  };
}
