# Project operating guide

This file is the agent entry point and applies to the whole repository. Read it before changing files.

## Start here

1. Read `README.md` for the project map and setup instructions.
2. Read `docs/README.md` for documentation ownership and where project context lives.
3. If working in Codex, read `CODEX.md` for Codex-specific workflow notes.
4. If implementing with Claude Code, read `CLAUDE.md`.
5. Read `docs/spec.md` before changing product behavior or implementation.
6. Read `docs/tasks.md` and continue the first unchecked task in order. If the board is empty, clarify the next task in the docs before implementation.
7. Read relevant architecture notes in `docs/architecture.md` and decisions in `docs/decisions/` when they exist.

## Change workflow

- **Planning and implementation handoff:** Codex owns planning, requirements, task ordering, and acceptance criteria. Keep the agreed plan in `docs/spec.md` and `docs/tasks.md`. Claude Code implements that plan. If implementation reveals a product or scope decision, document the question and return it to Codex for a planning update before proceeding.
- **Team input:** Capture each teammate’s initial proposal in `docs/initial-plans.md`. Synthesize accepted work into the authoritative spec and task board; the individual plans are input, not additional task boards.
- **Implementation handoff:** Use `docs/claude-remaining-phases.md` as the ordered Claude Code runbook. Claude may receive the runbook at once, but must implement one task-board item at a time, verify its acceptance criteria, then continue without waiting for a separate prompt. It should report changes and verification without silently redefining scope.

- For feature work, write or update a focused test in `tests/` first, run it to confirm it fails for the expected reason, then implement the smallest change and run the relevant tests again.
- Do not add implementation code before its test unless the task is explicitly documentation, setup, or another non-feature change. Explain any necessary exception in the task notes.
- Keep modules focused. Aim for fewer than 150 lines per source file; split files when that improves clarity, not just to satisfy a count.
- Keep `docs/spec.md` as current intended behavior and `docs/tasks.md` as the ordered execution board. Update both when scope or completion changes.
- Do not mark a task complete until its acceptance criteria are met and required checks pass. Record skipped checks and why.
- Prefer small, reviewable changes. Do not overwrite user changes or unrelated project decisions.

## Conventions

- Use the project’s established language, commands, formatting, and test tools; document them in `README.md`.
- Put durable product requirements in `docs/spec.md`, system structure in `docs/architecture.md`, and significant tradeoffs in `docs/decisions/`.
- Keep credentials, local machine state, and generated output out of source control.
- When creating a new project from this framework, replace bracketed template text and remove irrelevant stack-specific folders and examples.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
