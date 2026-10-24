import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { resolveAuthProviderName } from "@/auth/provider-name";
import {
  type AccessConfig,
  createAccessProvider,
  verifyAccessToken,
} from "@/auth/providers/access-jwt";
import { createNoneProvider } from "@/auth/providers/none";

const config: AccessConfig = {
  issuer: "https://team.cloudflareaccess.com",
  audience: "access-audience",
  certsUrl: "https://team.cloudflareaccess.com/cdn-cgi/access/certs",
};

async function signedToken(options: { audience?: string; issuer?: string } = {}) {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test-key";
  jwk.alg = "RS256";

  const token = await new SignJWT({ email: "owner@example.com" })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(options.issuer ?? config.issuer)
    .setAudience(options.audience ?? config.audience)
    .setSubject("access-user-id")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

  return { token, keys: createLocalJWKSet({ keys: [jwk] }) };
}

describe("access provider", () => {
  it("returns null without the Access JWT header", async () => {
    const provider = createAccessProvider(config);
    expect(await provider.getSession(new Request("https://example.com/admin"))).toBeNull();
  });

  it("returns null when Access is not configured", async () => {
    const provider = createAccessProvider(null);
    const request = new Request("https://example.com/admin", {
      headers: { "cf-access-jwt-assertion": "jwt" },
    });
    expect(await provider.getSession(request)).toBeNull();
  });

  it("verifies a signed Access JWT and reads the email", async () => {
    const { token, keys } = await signedToken();
    expect(await verifyAccessToken(token, config, keys)).toEqual({
      userId: "access-user-id",
      email: "owner@example.com",
    });
  });

  it("rejects a token for another audience or issuer", async () => {
    const wrongAudience = await signedToken({ audience: "other" });
    const wrongIssuer = await signedToken({ issuer: "https://evil.example.com" });

    expect(await verifyAccessToken(wrongAudience.token, config, wrongAudience.keys)).toBeNull();
    expect(await verifyAccessToken(wrongIssuer.token, config, wrongIssuer.keys)).toBeNull();
  });

  it("rejects an unsigned or malformed token", async () => {
    const { keys } = await signedToken();
    expect(await verifyAccessToken("not-a-jwt", config, keys)).toBeNull();
  });

  it("does not own any route", async () => {
    expect(
      await createAccessProvider(config).handle(new Request("https://example.com/")),
    ).toBeNull();
  });
});

describe("none provider", () => {
  it("always returns a development session", async () => {
    expect(await createNoneProvider().getSession(new Request("https://example.com/"))).toEqual({
      userId: "dev",
      email: "dev@localhost",
    });
  });
});

describe("resolveAuthProviderName", () => {
  it("defaults to password", () => {
    expect(resolveAuthProviderName(undefined, false)).toBe("password");
    expect(resolveAuthProviderName("password", false)).toBe("password");
    expect(resolveAuthProviderName("access", false)).toBe("access");
  });

  it("allows none only in development", () => {
    expect(resolveAuthProviderName("none", true)).toBe("none");
    expect(() => resolveAuthProviderName("none", false)).toThrow(/development/);
  });
});
