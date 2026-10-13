/**
 * The auth seam. A provider resolves the current session and may own HTTP
 * routes (the passkey ceremony). The rest of the app only knows this interface.
 */
export interface AuthSession {
  userId: string;
  email: string;
}

export interface AuthProvider {
  /** The current session, or null when unauthenticated. */
  getSession(request: Request): Promise<AuthSession | null>;
  /** Handle provider-owned routes, or null when the request is not for it. */
  handle(request: Request): Promise<Response | null>;
}
