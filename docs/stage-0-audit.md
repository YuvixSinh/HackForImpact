# Stage 0 audit: questions for Codex

- Date: 2026-11-21
- Author: Claude Code (Stage 0 repository audit, no product code written)
- Status: resolved

## Repository state (verified)

- No application code: no `package.json`, lockfile, `.gitignore`, or `.env.example`. `src/` and `tests/` contain only `.gitkeep`.
- Toolchain: Node v26.13.1, npm 11.20.0, git 2.56. Not installed: pnpm, yarn, bun, Supabase CLI, Docker, Vercel CLI.
- Registry reachable. Latest: `next` 16.4.6 (engines `>=20.9.0`), `@supabase/supabase-js` 2.119.2, `vitest` 5.1.1. SolvaPay publishes `@solvapay/server`, `@solvapay/next`, `@solvapay/react`, `@solvapay/core`.
- `README.md` setup section is still template placeholders; not updated because no commands can be verified yet.

## Resolved decisions

1. **Supabase for development — accepted hybrid approach.** Local development uses in-memory repositories and documented demo-auth behaviour, so neither Docker nor a local Supabase instance is required. Task 2 targets a linked hosted Supabase project. The project used for this prototype is CLI-labeled `production` and holds test data.
2. **Schema check — hosted integration check accepted.** SQL review alone is rejected. Task 2 applies migrations with `npx supabase db push --remote --yes`, runs `npm run db:verify` for RLS, API-role grants, and RPC checks, and runs `npm run test:integration`. PGlite is not added. All three checks passed on 2026-11-21.
3. **SolvaPay fit and package — partially accepted.** Use `@solvapay/server` only on server routes for sandbox payment authorisation and checkout, wrapped in a `PaymentAdapter`. SolvaPay does not provide delivery escrow and therefore the requirement to hold funds until delivery is rejected. A local testing adapter is accepted for the complete demo payment lifecycle, including simulated settlement and provider payout. Production marketplace settlement needs a later provider decision.

## Assumption resolution

| # | Assumption | Resolution |
| --- | --- | --- |
| 4 | Manual scaffold instead of `create-next-app` in place | **Accepted.** Preserve the existing instruction files and use manual setup. |
| 5 | npm package manager | **Accepted.** |
| 6 | Vitest for unit/integration; choose Playwright later | **Accepted.** Add Playwright only in Milestone 5 if browser smoke coverage needs it. |
| 7 | Tailwind CSS v4 | **Accepted.** |
| 8 | Node 26 locally; engines `>=20.9.0` | **Accepted.** Node 26 is supported locally; the lower engine bound supports Vercel. |
| 9 | One shipper maps to one owner account/organisation | **Accepted.** Business and individual shippers use the same account boundary. |
| 10 | At-rest encryption plus RLS meets the prototype requirement | **Accepted.** Field-level encryption is deferred; secrets and payment data remain outside application records. |
| 11 | Relative fixture dates or injected clock | **Accepted.** Use an injected clock in business-rule tests; demo seed dates are generated relative to the reset time. |
| 12 | Postgres RPC provides atomic capacity reservation | **Accepted.** The in-memory repository must reproduce the same success and contention semantics. |
| 13 | 150-line limit excludes generated configuration | **Accepted.** Hand-written application modules still follow the guideline. |

## Security notes for the plan

- Add `.gitignore` (`.env*` except `.env.example`, `node_modules/`, `.next/`) as the first step of task 1.
- Service-role and SolvaPay keys must never use the `NEXT_PUBLIC_` prefix; only the Supabase anon key is public.
- The cross-account matching query must expose listing fields only, never other accounts' bookings or shipments.
- Treat the GitHub remote as potentially public until its visibility is explicitly verified; never commit keys, customer data, or payment tokens.

## Proposed Milestone 1 scope (for confirmation)

- **Task 1:** manual Next 16.4.6 + TypeScript + Tailwind + ESLint + Vitest setup; `dev`/`build`/`start`/`lint`/`typecheck`/`test` scripts; `.gitignore`, `.env.example`; layout with persisted, no-flash light/dark theme; placeholder `/shipper` and `/provider`; one theme-storage test; verified commands recorded in README.
- **Task 2:** domain types in `src/lib/domain/`, repository interfaces and in-memory implementation in `src/lib/db/`, `supabase/migrations/*.sql` with RLS and reservation function; repository tests plus the chosen schema check; minimal fixtures.
- **Task 3:** business-shipper, individual-shipper and provider entry; server-side account resolution; integration test that one account cannot read another's shipments or bookings.
