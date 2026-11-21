# Claude Code build prompts for AutoShip

Use Claude Opus 5.5. Stages 0–3 are complete. The user may send Stages 4 and 5 together; after those pass, use `docs/claude-remaining-phases.md` as the single ordered runbook for all remaining work. Keep each task test-first and update `docs/tasks.md` only when acceptance criteria pass.

## Shared instruction for every stage

Paste this at the start of every Claude Code task:

```text
You are implementing AutoShip. Read AGENTS.md, CLAUDE.md, docs/spec.md, docs/architecture.md, and docs/tasks.md first. Work on the assigned task or explicitly assigned ordered runbook. Preserve existing user changes. For feature work, write or update focused tests first and run them to confirm they fail before implementation. Keep modules focused. Do not alter product scope, acceptance criteria, dependencies, or task ordering without reporting the issue. When assigned a runbook, finish and verify one task-board item before continuing to the next. At the end, report files changed, behavior delivered, tests/checks run and results, and remaining risks or planning questions.
```

## Stage 0: Repository and implementation audit

**Prompt**

```text
Inspect the current repository against docs/spec.md and docs/architecture.md. Do not implement product features. Identify the actual stack, missing setup, conflicts, security risks, and the smallest viable foundation for Milestone 1. Update README.md only if you can state verified commands. Return a concise implementation plan mapped to docs/tasks.md and list every assumption that needs review.
```

**What it catches:** Incorrect assumptions about the existing codebase, missing dependencies, unsuitable libraries, and secrets/configuration problems before feature code is written.

## Stage 1: Application foundation

**Prompt**

```text
Read `docs/stage-0-audit.md` and its resolved decisions before starting. Complete only the first unchecked task in Milestone 1: set up the AutoShip application shell. Manually scaffold Next.js 16.4.6, TypeScript, Tailwind CSS v4, ESLint, and Vitest using npm. Set Node engines to `>=20.9.0`; add `.gitignore`, `.env.example` without secrets, responsive no-flash persistent light/dark theme, and placeholder `/shipper` and `/provider` routes. Add the minimum tests/checks appropriate to the setup and record exact verified commands in README.md. Do not add Supabase, matching, bookings, payments, or mock shipment data yet.
```

**Review before continuing:** Run the listed commands yourself. Check desktop and narrow-window layout, then refresh to confirm the theme preference persists.

## Stage 2: Domain model, database, and demo data

**Prompt**

```text
Complete only the next unchecked Milestone 1 task: domain models and database boundaries. Implement typed models and repository interfaces for accounts, shipments, capacity, policy, matches, approvals, bookings, tracking events, and emissions. Implement in-memory repositories for local development. Add Supabase migrations, RLS, and a reservation RPC for the linked hosted development project; verify them with `npx supabase db push --linked`, `npm run db:verify`, and `npm run test:integration`. Do not accept SQL review alone as schema verification. Create only minimal test fixtures; do not create the scripted mock-demo dataset until Milestone 5. Do not build dashboards beyond what tests require.
```

**What it catches:** Data models that cannot represent approval, disruption, or provider flows; account data leaks; demos that need hand-edited database records.

## Stage 3: Authentication and roles

**Prompt**

```text
Complete only the next Milestone 1 task: account entry and role-specific dashboard shells. Implement business-shipper, individual-shipper, and provider paths. Enforce server-side account isolation. Use a documented demo-auth fallback only if real Supabase Auth prevents local development. Add integration tests proving one account cannot retrieve another account's shipment or booking data. Do not implement shipment workflows yet.
```

**Stop condition:** Claude must show the access-control test result before you proceed.

## Stage 4: Matching and scoring engine

**Prompt**

```text
Complete the two matching tasks in Milestone 2 and nothing else. First write focused failing tests for eligibility. Then implement pure, server-side matching that filters on time, transport preference, dimensions, weight, capacity, dangerous goods, and provider policy. Calculate price, CO2, arrival, deadline margin, and rank the top three using the selected optimisation preference. Return closest alternatives with explicit compromises when there is no exact match. Keep the engine independent of React and database details.
```

**What it catches:** Hard business rules buried in UI code, options that are scored despite being impossible, and a ranking system that ignores the user's preference.

## Stage 5: Policy and approval engine

**Prompt**

```text
Complete the policy and approvals task in Milestone 2. Start with failing unit tests for every rule in docs/spec.md: price, declared value, critical status, deadline margin, dangerous goods, and no match. Implement policy evaluation and account-editable thresholds. A flag must produce an approval result and must not call the booking service. Keep it pure and testable. Do not build the full visual approval flow yet.
```

**Stop condition:** Ask Claude to show a test matrix proving each rule blocks automatic booking independently.

## Stage 6: Shipper intake and decision screens

**Prompt**

```text
Complete the next two Milestone 3 tasks: shipment intake plus comparison/approval UI. Build the validated shipment form, mode and optimisation controls, manual comparison, Autopilot explanation, no-match alternatives, and approval actions. Call server endpoints/services for matching and policy decisions; do not reproduce those rules in the browser. Write integration tests for automatic-book eligible, approval-required, and no-match submissions. Do not add payment booking yet.
```

**Review before continuing:** Use seeded scenarios to verify that automatic, approval, and no-match messages are understandable without technical language.

## Stage 7: Booking and SolvaPay adapter

**Prompt**

```text
Complete the bookings, SolvaPay adapter, and feed-card task only. Build a server-only `@solvapay/server` adapter for sandbox payment authorisation/checkout and a testing fallback that simulates authorisation, delivery settlement, provider payout, and failure. SolvaPay does not provide delivery escrow, so do not claim that money is held. Implement atomic capacity reservation, receipt references, and failure-safe rollback. Add tests proving that concurrent/repeated booking cannot oversell capacity and that a payment failure confirms neither booking nor capacity reduction. Never expose payment secrets or accept real card data in the browser.
```

**What it catches:** Double booking, payment success shown before a confirmed reservation, and leaked credentials.

## Stage 8: Provider and disruption flows

**Prompt**

```text
Complete the provider capacity-management and simulated-tracking tasks in Milestone 4. Add provider listing management and booking visibility, then tracking timeline/map simulation, delays/cancellations, in-app messages, and policy-gated re-matching. Use the same matching, policy, and booking services already implemented. Add integration tests for a provider listing becoming bookable and for a delay leading to either compliant rebooking or approval.
```

**What it catches:** Provider changes bypassing capacity rules; rebooking that violates user policy; tracking updates detached from booking status.

## Stage 9: Carbon summary and complete demo data

**Prompt**

```text
Complete the sustainability summary and demo-readiness tasks. Implement tested CO2 baseline/savings calculations and monthly/yearly display. Create a resettable seeded dataset with two providers, six listings across road/sea/air, and five shipment demonstrations: three automatic bookings, one price approval, and one critical or no-match result. Add one end-to-end smoke test that uses the scripted demo path. Do not add deferred live integrations.
```

## Stage 10: Final verification and repair pass

**Prompt**

```text
Do not add features. Audit the implementation against every acceptance criterion in docs/spec.md and every task in docs/tasks.md. Run lint, unit tests, integration/end-to-end tests, and a production build. Fix only failures, security gaps, broken account isolation, broken mock flows, accessibility regressions, or inconsistencies with the documents. Update documentation with exact verification results and remaining intentional mock limitations. Return a criterion-by-criterion verification report.
```

## Rules for reviewing Claude's output

- Do not accept “it should work.” Require the named test or check and its result.
- Do not combine stages 4–8 in one prompt. Their separation prevents matching, policy, payment, and UI errors from masking one another.
- If Claude reports a product ambiguity, bring it back to Codex for a plan update before sending another implementation prompt.
- Commit after each completed stage so a later experiment can be reversed cleanly.
