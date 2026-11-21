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
| `src/` | Application or library source code |
| `tests/unit/` | Focused tests for individual units |
| `tests/integration/` | Tests across module/service boundaries |

## Project setup

Replace these prompts when adapting the framework:

- **Runtime / package manager:** [fill in]
- **Install:** [command]
- **Run locally:** [command]
- **Test:** [command]
- **Lint / format:** [command]
- **Build:** [command]

## Starting a project from this framework

Copy the directory, then replace all bracketed prompts in the active docs. Make `docs/spec.md` and `docs/tasks.md` specific to the new project, document the actual stack and commands, and remove folders or guidance that do not apply. Keep the root agent files as pointers to the shared workflow.
