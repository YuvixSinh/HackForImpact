# 0002: Use in-memory local development and hosted Supabase verification

- Status: accepted
- Date: 2026-11-21

## Context

The repository has no Docker or locally installed Supabase CLI, but AutoShip needs a runnable prototype before hosted credentials are available. It also needs real Postgres row-level-security and reservation checks before data-boundary work is considered complete.

## Decision

Run the application locally against an in-memory repository that implements the same interfaces as the Supabase repository. Use a linked hosted Supabase project as the required integration-test environment. Apply migrations with `npx supabase db push --remote --yes`, then run project-owned database verification and integration tests. Do not use SQL review alone or add PGlite. The linked project for this prototype is CLI-labeled `production` and is used with prototype test data.

## Consequences

Stage 1 can start immediately without external credentials. Task 2 requires hosted Supabase credentials and verifies actual table grants, RLS, and RPC behaviour before account functionality depends on it. Repository contracts must stay equivalent across the in-memory and Supabase implementations. Verification passed on 2026-11-21 (`db:verify`: 6 tests; `test:integration`: 17 tests).
