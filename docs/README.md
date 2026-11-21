# Documentation map

These documents are the project’s durable context. Keep them accurate as implementation and scope evolve.

## Sources of truth

| Document | Owns | Update when |
| --- | --- | --- |
| [`spec.md`](spec.md) | User/problem, goals, requirements, constraints, interfaces, acceptance criteria | Product behavior or scope changes |
| [`architecture.md`](architecture.md) | Implemented structure, components, data flow, boundaries, operations | System structure or deployment changes |
| [`tasks.md`](tasks.md) | Ordered, actionable work and completion status | Work is planned, reordered, started, or finished |
| [`initial-plans.md`](initial-plans.md) | Individual teammates’ first-pass proposals | A teammate adds or revises an initial plan |
| [`claude-build-prompts.md`](claude-build-prompts.md) | Staged implementation prompts and review gates for Claude Code | Before assigning or reviewing implementation work |
| [`decisions/`](decisions/) | Context, options, and rationale for consequential choices | A decision is hard to reverse or affects multiple areas |
| [`templates/`](templates/) | Reusable blank document formats | The framework’s documentation approach changes |

Starter copies are available at [`templates/spec.template.md`](templates/spec.template.md) and [`templates/tasks.template.md`](templates/tasks.template.md). The root `spec.md`, `architecture.md`, and `tasks.md` are the active project documents; edit them for a project rather than leaving the agent to guess which copy is authoritative.

## Working with the documents

- Read `spec.md` and the next task before implementation.
- Collect individual proposals in `initial-plans.md`; Codex turns accepted proposals into the spec and ordered task board, and Claude Code implements the agreed tasks.
- Keep tasks small enough to complete and verify; include acceptance criteria and dependencies for nontrivial work.
- Record completion in `tasks.md` with a short verification note when useful.
- Describe the current system in `architecture.md`; do not duplicate the whole specification there.
- Link to decisions from the relevant spec or architecture section rather than copying their rationale.
- If a project has no service/API, frontend, database, or deployment component, say “Not applicable” instead of inventing one.
