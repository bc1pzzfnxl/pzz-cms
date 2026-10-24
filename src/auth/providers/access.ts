import { env } from "cloudflare:workers";
import { type AccessConfig, createAccessProvider } from "./access-jwt";

/**
 * Cloudflare Access configuration. Access authenticates at the edge, but the
 * Worker still verifies the signed JWT: trusting the header alone lets anyone
 * who can reach the Worker (or a misconfigured route) mint an admin session.
 */
export function accessConfig(): AccessConfig | null {
  const domain = env.ACCESS_TEAM_DOMAIN?.trim();
  const audience = env.ACCESS_AUD?.trim();
  if (!domain || !audience) return null;

  const team = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return {
    issuer: `https://${team}`,
    audience,
    certsUrl: env.ACCESS_CERTS_URL?.trim() || `https://${team}/cdn-cgi/access/certs`,
  };
}

export function createAccessProviderFromEnv() {
  return createAccessProvider(accessConfig());
}

export type { AccessClaims, AccessConfig } from "./access-jwt";
