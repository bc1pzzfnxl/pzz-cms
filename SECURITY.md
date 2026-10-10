# Security Policy

## Reporting a vulnerability

Open a private security advisory on GitHub, or contact the maintainer directly.
Do not open a public issue for a security problem.

## Scope

The CMS serves a public site and a protected admin. The admin is protected by
Cloudflare Access; the application does not implement its own session handling.

## Secrets

Secrets live in `.dev.vars` locally and in Cloudflare secrets in production.
They are never committed. If a secret leaks, rotate it immediately in the
Cloudflare dashboard.
