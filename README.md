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
| `src/app/` | Next.js routes and root layout (`/`, `/shipper`, `/provider`) |
| `src/components/` | Shared UI components (header, theme toggle, placeholders) |
| `src/lib/` | Framework-independent logic (currently theme persistence) |
| `tests/unit/` | Focused tests for individual units |
| `tests/integration/` | Tests across module/service boundaries |

## Project setup

AutoShip is a Next.js 16.4.6 app (App Router, TypeScript, Tailwind CSS v4) using npm. Unit tests use Vitest with jsdom and Testing Library.

- **Runtime / package manager:** Node.js and npm. The app supports Node `>=20.9.0` (`engines`). The dev tooling (Vitest 5, jsdom 31) needs Node `^22.12.0`, `^24`, or `>=26`. Verified on Node 26.13.1 and npm 11.20.0.
- **Environment:** No variables are needed for the app shell. Copy `.env.example` to `.env.local` when later tasks add them; never commit `.env*` files other than the example.

All commands below were run successfully from the repository root:

| Purpose | Command | Notes |
| --- | --- | --- |
| Install | `npm install` | Use `npm ci` for a clean install from `package-lock.json`. |
| Run locally (development) | `npm run dev` | Serves http://localhost:3000. |
| Test | `npm test` | Runs Vitest once (`tests/**/*.test.ts(x)`); `npm run test:watch` for watch mode. |
| Lint | `npm run lint` | ESLint with `eslint-config-next` (core web vitals + TypeScript). |
| Type check | `npm run typecheck` | `tsc --noEmit`. |
| Build | `npm run build` | Production build into `.next/`. |
| Run production build | `npm start` | Run after `npm run build`; serves http://localhost:3000. |

Before marking work complete, run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

## Starting a project from this framework

Copy the directory, then replace all bracketed prompts in the active docs. Make `docs/spec.md` and `docs/tasks.md` specific to the new project, document the actual stack and commands, and remove folders or guidance that do not apply. Keep the root agent files as pointers to the shared workflow.
