# Codex planning notes

Codex loads the repository’s `AGENTS.md` as its persistent project instructions. Follow those shared rules first. Codex owns planning and decision synthesis; Claude Code implements the agreed tasks.

Before planning, inspect teammate proposals in `docs/initial-plans.md`, the current task in `docs/tasks.md`, and requirements in `docs/spec.md`. Clarify goals, scope, dependencies, and acceptance criteria. Keep the accepted plan in `docs/spec.md` and `docs/tasks.md`, with verification commands for larger tasks. Hand Claude Code one concrete task at a time. Review its report against the agreed criteria; if implementation reveals a scope decision, update the plan before dependent work continues.
