import type { Page } from "@playwright/test";

/**
 * Attach a virtual WebAuthn authenticator (Chromium/CDP) so passkey flows can
 * be driven in tests without a physical device.
 */
export async function attachVirtualAuthenticator(page: Page): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send("WebAuthn.enable");
  await client.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

/** Register the owner passkey through the one-shot setup route. */
export async function registerPasskey(page: Page, token: string): Promise<void> {
  await attachVirtualAuthenticator(page);
  await page.goto(`/admin/setup/?token=${encodeURIComponent(token)}`);
  await page.getByTestId("passkey-register").click();
  await page.waitForURL(/\/admin\/?$/);
}
