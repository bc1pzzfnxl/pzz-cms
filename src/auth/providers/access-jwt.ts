import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";
import type { AuthProvider } from "../types";

export interface AccessConfig {
  issuer: string;
  audience: string;
  certsUrl: string;
}

export interface AccessClaims {
  userId: string;
  email: string;
}

/**
 * Verify a Cloudflare Access JWT against the team's signing keys. Returns null
 * on any failure, including a missing configuration: fail closed.
 */
export async function verifyAccessToken(
  token: string,
  config: AccessConfig | null,
  keys?: JWTVerifyGetKey,
): Promise<AccessClaims | null> {
  if (!config) return null;

  const keySet = keys ?? createRemoteJWKSet(new URL(config.certsUrl));

  try {
    const { payload } = await jwtVerify(token, keySet, {
      issuer: config.issuer,
      audience: config.audience,
    });
    const email = typeof payload.email === "string" ? payload.email.trim() : "";
    if (!email) return null;

    return {
      userId: typeof payload.sub === "string" && payload.sub ? payload.sub : email,
      email,
    };
  } catch {
    return null;
  }
}

export function createAccessProvider(config: AccessConfig | null): AuthProvider {
  return {
    async getSession(request) {
      const token = request.headers.get("cf-access-jwt-assertion");
      if (!token) return null;
      return verifyAccessToken(token, config);
    },
    async handle() {
      return null;
    },
  };
}
