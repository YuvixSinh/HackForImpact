# 0004: Use a documented demo sign-in until Supabase Auth is configured

- Status: accepted for the prototype (Codex, 2026-11-21)
- Date: 2026-11-21

## Context

Milestone 1 task 3 needs sign-up and sign-in for business shippers, individual shippers, and providers, with server-side account isolation. The app currently uses in-memory repositories and demo data; linking a hosted Supabase project only enabled schema and RPC verification. Adding Supabase Auth alone would not make app data persistent or shared, and would add a dependency before the Supabase repositories exist.

## Decision

- `src/lib/auth/` provides an `AuthService` (sign up, sign in, resolve viewer from session) backed by an in-process `DemoUserStore` with salted scrypt password hashes.
- Sessions are stateless HMAC-SHA256-signed tokens in an HttpOnly, SameSite=Lax cookie (`autoship_session`, 7 days, `Secure` in production), signed with `AUTH_SECRET`. Development uses a random per-process key when it is unset; production refuses to run without it.
- Every request resolves the viewer on the server: a valid signature, an unexpired token, a known user, and current membership of the claimed account. Pages and route handlers read data only through `src/lib/server/account-data.ts`, which scopes repositories to the viewer's account.
- Demo users and data live in memory: they reset on restart and are not shared between serverless instances.

Keep this demo authentication for the prototype. Revisit it together with Supabase-backed repositories before any public or multi-user deployment; then add `@supabase/ssr`, Supabase Auth, and persistent repositories as one planned migration.

## Consequences

The full entry flow works locally and is covered by tests. It is not production authentication: there is no email verification, password reset, or rate limiting, and data does not persist. Replacing it with Supabase Auth (likely via `@supabase/ssr`, a new dependency) and Supabase-backed repositories requires a linked project and a planning decision on the switch-over.
