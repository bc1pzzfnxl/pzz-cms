# Security Policy

## Reporting a vulnerability

Open a private security advisory on GitHub, or contact the maintainer directly.
Do not open a public issue for a security problem.

## Authentication

The admin (`/admin`) uses a single owner account with a password (Better Auth).

Protections in place:

- **Password hashing**: scrypt (Better Auth default), never stored in clear.
- **Sessions**: D1-backed, `httpOnly`, `Secure` on HTTPS, `SameSite=Lax`,
  7 days with a 1-day rolling refresh. Changing the password revokes other
  sessions.
- **No signup**: the public sign-up route is disabled; only the one-shot setup
  can create the owner, and it refuses once an account exists.
- **Rate limiting**: database-backed (global across Worker isolates),
  5 sign-in attempts per minute per IP, 100 requests per minute overall.
  The client IP comes from `cf-connecting-ip`, which Cloudflare controls.
- **CSRF**: Better Auth validates the `Origin` and Fetch Metadata, requires
  JSON for state-changing requests, and uses `SameSite=Lax` cookies.
- **Security headers** on admin and auth responses: `nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- **Secrets**: `BETTER_AUTH_SECRET` is 32 random bytes; the one-shot
  `SETUP_TOKEN` is deleted after setup.

## Residual risks

No authentication is infallible. Known limits:

- **No MFA.** A leaked password (or a stolen session cookie) grants admin
  access. Use a long, unique password from a password manager.
- **No breached-password check.** A password reused from a breach would work.
- **Per-IP rate limiting.** A distributed attacker with many IPs can still try
  passwords; the password must be strong.
- **No CSP.** The admin sets framing and sniffing headers but not a
  Content-Security-Policy yet.
- **No audit log.** Admin actions are not recorded.
- **`AUTH_PROVIDER=none` opens the admin.** It is for local development only;
  never set it in production.
- **The `access` adapter trusts Cloudflare headers.** It checks that
  `cf-access-jwt-assertion` is present but does not verify its signature. Only
  select it when Cloudflare Access actually fronts the Worker and strips
  client-supplied copies of those headers.
- **Stored article HTML.** Article bodies are rendered with `set:html`. The
  author controls them, but an attacker who reaches the editor already owns
  the site.

## Secrets

Secrets live in `.dev.vars` locally and in Cloudflare secrets in production.
They are never committed. If a secret leaks, rotate it in the Cloudflare
dashboard and, for `BETTER_AUTH_SECRET`, use the versioned `secrets` option so
existing data stays readable.
