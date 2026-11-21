# Project Framework

A reusable starting structure for projects worked on with coding agents. The goal is to make project context, plans, and workflow discoverable from one predictable entry point.

## For a person or agent starting work

1. Read this file for setup and the repository map.
2. Read [`AGENTS.md`](AGENTS.md) for shared working rules. Codex planning notes are in [`CODEX.md`](CODEX.md), and Claude Code implementation notes are in [`CLAUDE.md`](CLAUDE.md).
3. Read [`docs/README.md`](docs/README.md) to find the authoritative planning documents.
4. Read [`docs/spec.md`](docs/spec.md) for intended behavior and [`docs/tasks.md`](docs/tasks.md) for the ordered work.
5. Follow the setup and validation commands recorded below once a project fills them in.

Each teammate can record an initial proposal in [`docs/initial-plans.md`](docs/initial-plans.md). Codex synthesizes the plans into the spec and task board; Claude Code implements the agreed tasks.

Use [`docs/claude-build-prompts.md`](docs/claude-build-prompts.md) to give Claude Code one implementation stage at a time and review its checks before moving forward.

## Repository map

| Path | Purpose |
| --- | --- |
| `AGENTS.md` | Shared agent instructions and change workflow |
| `CODEX.md` | Codex-specific planning workflow notes |
| `CLAUDE.md` | Claude Code implementation workflow |
| `docs/README.md` | Documentation index and source-of-truth map |
| `docs/spec.md` | Product requirements, interfaces, and acceptance criteria |
| `docs/architecture.md` | Current system structure and important boundaries |
| `docs/tasks.md` | Ordered work board with dependencies and completion status |
| `docs/initial-plans.md` | Individual team members’ initial proposals |
| `docs/claude-build-prompts.md` | Staged Claude Code implementation and review prompts |
| `docs/decisions/` | Durable records of significant technical/product decisions |
| `docs/templates/` | Copyable starting documents for new projects |
| `src/app/` | Routes: `/` (account entry), `/signup`, `/signup/[role]`, `/signin`, `/shipper`, `/provider`, read-only `/api/shipments` and `/api/bookings`; server actions in `actions/` |
| `src/components/` | Shared UI: header, theme toggle/script, sign-in/sign-up forms (`auth/`), role dashboards (`dashboards/`) |
| `src/lib/auth/` | Demo sign-in (ADR 0004): roles, validation, password hashing, signed session tokens, `AuthService` |
| `src/lib/server/` | Server-only app context, session cookie handling, and the account-scoped data access layer |
| `src/lib/domain/` | Typed domain models (accounts, shipments, capacity, policy, matches, approvals, bookings, tracking, emissions, audit) |
| `src/lib/db/` | Repository interfaces, in-memory implementation (`memory/`), and server-only Supabase adapters (`supabase/`) |
| `src/lib/theme/` | Theme persistence and the no-flash init script |
| `supabase/` | Supabase CLI config and SQL migrations (schema, RLS, reservation RPCs) |
| `tests/unit/` | Fast tests, including the in-memory repositories and auth (`npm test`) |
| `tests/contracts/` | Shared behaviour suites run against both in-memory and Supabase implementations |
| `tests/integration/app/` | Local integration: route handlers + sessions + repositories, including account isolation (`npm test`) |
| `tests/integration/hosted/` | Hosted Supabase tests (`npm run test:integration`) |
| `tests/db/` | Hosted schema verification (`npm run db:verify`) |

## Project setup

AutoShip is a Next.js 16.4.6 app (App Router, TypeScript, Tailwind CSS v4) using npm. Unit tests use Vitest with jsdom and Testing Library.

- **Runtime / package manager:** Node.js and npm. The app supports Node `>=20.9.0` (`engines`). The dev tooling (Vitest 5, jsdom 31) needs Node `^22.12.0`, `^24`, or `>=26`. Verified on Node 26.13.1 and npm 11.20.0.
- **Environment:** `npm run dev` needs no variables: it uses in-memory repositories and the demo sign-in. `npm start` (production mode) needs `AUTH_SECRET` (32+ characters). The hosted checks need the Supabase variables. All are listed in `.env.example`; set them in `.env.local` and never commit `.env*` files other than the example.
- **Demo sign-in (ADR 0004):** accounts and data are kept in server memory and are cleared when the server restarts. Create an account at `/signup` (business shipper, individual shipper, or transport provider); each type lands on its own dashboard. This is a local-development stand-in for Supabase Auth, not production authentication.

**Windows PowerShell:** if `npm` fails with "running scripts is disabled on this system", PowerShell's execution policy is blocking the `npm.ps1` wrapper. Use `npm.cmd` and `npx.cmd` instead (for example `npm.cmd test`, `npx.cmd supabase link`), run the commands from Command Prompt or Git Bash, or allow local scripts for your user with `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

All commands below were run successfully from the repository root:

| Purpose | Command | Notes |
| --- | --- | --- |
| Install | `npm install` | Use `npm ci` for a clean install from `package-lock.json`. |
| Run locally (development) | `npm run dev` | Serves http://localhost:3000. |
| Test | `npm test` | Unit tests and local integration tests (`tests/unit`, `tests/integration/app`), no network; `npm run test:watch` for watch mode. |
| Lint | `npm run lint` | ESLint with `eslint-config-next` (core web vitals + TypeScript). |
| Type check | `npm run typecheck` | `tsc --noEmit`. |
| Build | `npm run build` | Production build into `.next/`. |
| Run production build | `npm start` | Run after `npm run build` with `AUTH_SECRET` set (e.g. in `.env.local`); serves http://localhost:3000. |

Before marking work complete, run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

### Hosted Supabase checks

These run against the linked hosted Supabase project (no Docker needed) and fail if the variables in `.env.local` are missing. They passed on 2026-11-21: schema verification 6/6 and hosted integration 17/17. The current project is CLI-labeled `production` and is used with prototype test data.

1. Create a Supabase development project, then copy its URL, anon key, and service-role key into `.env.local`.
2. Sign in and link (prompts for an access token and the database password):
   `npx supabase login`, then `npx supabase link --project-ref <project-ref>`
3. Run the checks:

| Purpose | Command | Notes |
| --- | --- | --- |
| Apply migrations | `npx supabase db push --remote --yes` | Applies `supabase/migrations/*.sql` to the linked project. |
| Verify schema | `npm run db:verify` | RLS on every table, policies present, reservation RPCs limited to the service role. |
| Integration tests | `npm run test:integration` | Reservation contract against the RPCs and account isolation as real users. Creates throwaway `@example.com` users and deletes them afterwards. |

## Starting a project from this framework

Copy the directory, then replace all bracketed prompts in the active docs. Make `docs/spec.md` and `docs/tasks.md` specific to the new project, document the actual stack and commands, and remove folders or guidance that do not apply. Keep the root agent files as pointers to the shared workflow.
