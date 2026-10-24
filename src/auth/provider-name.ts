export type AuthProviderName = "password" | "access" | "none";

/**
 * Resolve the configured provider. `none` is a development-only escape hatch:
 * selecting it in a production build throws instead of silently opening the
 * admin.
 */
export function resolveAuthProviderName(
  value: string | undefined,
  isDev: boolean,
): AuthProviderName {
  if (value === "none") {
    if (!isDev) {
      throw new Error("AUTH_PROVIDER=none is only allowed in development.");
    }
    return "none";
  }

  return value === "access" ? "access" : "password";
}
