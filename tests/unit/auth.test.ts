import { describe, expect, it } from "vitest";
import { createAccessProvider } from "@/auth/providers/access";
import { createNoneProvider } from "@/auth/providers/none";

describe("access provider", () => {
  it("returns null without the Access JWT header", async () => {
    const provider = createAccessProvider();
    expect(await provider.getSession(new Request("https://example.com/admin"))).toBeNull();
  });

  it("reads the Access email header", async () => {
    const provider = createAccessProvider();
    const request = new Request("https://example.com/admin", {
      headers: {
        "cf-access-jwt-assertion": "jwt",
        "cf-access-authenticated-user-email": "owner@example.com",
      },
    });
    expect(await provider.getSession(request)).toEqual({
      userId: "owner@example.com",
      email: "owner@example.com",
    });
  });

  it("does not own any route", async () => {
    expect(await createAccessProvider().handle(new Request("https://example.com/"))).toBeNull();
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
