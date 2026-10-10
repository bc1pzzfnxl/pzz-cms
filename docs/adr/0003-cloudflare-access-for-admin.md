# ADR 0003 — Cloudflare Access for the admin

## Status

Accepted.

## Context

The admin needs authentication for a single user. Options considered: a passkey
system built into the CMS (like EmDash), VoidAuth, or Cloudflare Access.

## Decision

Protect `/admin` with Cloudflare Access. The application ships no login form and
stores no credentials.

## Consequences

- No authentication code to write or maintain for the MVP.
- Access policy is managed in the Cloudflare dashboard (a `wizard`-guided step).
- Moving the admin off Cloudflare later would require revisiting this decision.
