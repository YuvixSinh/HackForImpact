# AutoShip work plan

Complete tasks in this order. Claude Code must read the linked specification and assigned task before editing code.

## Milestone 1: Foundation

- [x] **Set up the application shell.** Manually scaffold Next.js 16.4.6, TypeScript, Tailwind CSS v4, ESLint, and Vitest using npm. Add Node `>=20.9.0` engines, `.gitignore`, `.env.example`, responsive light/dark themes, and placeholder `/shipper` and `/provider` routes. Record install, test, lint, typecheck, build, development, and production-start commands in `README.md`.
  - Acceptance: The app starts locally; themes persist without a visible flash on reload; the placeholders render; and secrets/build outputs are ignored.
  - Verification: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
  - Done 2026-11-21: all four checks pass (15 Vitest tests). `npm run dev` and `npm start` both served `/`, `/shipper`, and `/provider`. In the browser, the stored theme overrode the system preference after a full reload; the theme script runs in `<head>` before the body; no horizontal scroll at 375px; no console errors. Note: TypeScript pinned to `~6.0.3` and ESLint to `^9` because `typescript-eslint` and `eslint-plugin-react` (used by `eslint-config-next`) do not yet support TypeScript 7 or ESLint 10.

- [x] **Establish data boundaries.** Add typed domain models, repository interfaces, and an in-memory implementation for local development. Add Supabase migrations, row-level-security policies, and a capacity-reservation RPC for the linked hosted project. Create only minimum test fixtures; leave the scripted mock-demo dataset until Milestone 5.
  - Acceptance: Models and repositories support all primary flows; the in-memory reservation matches the RPC contract; hosted migrations include explicit API-role table grants while RLS remains enabled; providers cannot update capacity figures; and one account cannot read another's shipment or booking data.
  - Verification: `npx supabase db push --remote --yes`, `npm run db:verify`, and `npm run test:integration`.
  - Done 2026-11-21: five migrations applied to the linked Supabase project (`qzxnwsmafwjazudzaxmp`, CLI environment label `production`): core schema/reference factors, RLS, account and reservation RPCs, scoped API-role grants, and restoration of capacity column restrictions. `npm run db:verify` passes (6 tests); `npm run test:integration` passes (17 tests), including account isolation and reservation behavior. The first hosted test run exposed missing table grants; the grant migration was added. A follow-up test caught overly broad capacity update privileges; the final migration restored column-level restrictions. Four temporary users/accounts left by that failed run were removed; the successful run cleaned up its own fixtures.
  - Re-verified 2026-11-21: `npx supabase migration list --linked` shows all five migrations applied locally and remotely; `npx supabase db push --linked` reports "Remote database is up to date"; `npm run db:verify` passes (1 file, 6 tests); `npm run test:integration` passes (2 files, 17 tests, none skipped). No code or migration changes were needed.

- [x] **Create account entry and role-specific shells.** Add a clear sign-in/sign-up path for business shippers, individual shippers, and providers. Route each role to its own dashboard shell.
  - Acceptance: A demo user can enter either dashboard and cannot view another account's records.
  - Verification: Auth/access integration test.
  - Done 2026-11-21 with the demo sign-in fallback (ADR 0004, proposed). `tests/integration/app/account-isolation.test.ts` (4 tests) runs through the real route handlers and session cookie: another account gets 404 for a shipment or booking, missing or forged sessions get 401, and lists contain only the caller's records. `npm test` (61 tests), lint, typecheck, and build pass. In the browser, all three sign-up paths work, sign-in and sign-out work, a wrong password gets a generic error, dashboards redirect visitors and the wrong account kind, and an unknown role gives 404. Open: real Supabase Auth and Supabase-backed repositories remain future work; task 2 only verifies the schema and hosted reservation/RLS contracts.

## Milestone 2: Matching and policy engine

- [x] **[RED] Specify capacity eligibility.** Write focused tests for ready time, deadline, mode preference, dimensions, weight, remaining capacity, and cargo restrictions.
  - Acceptance: Tests fail before the matcher exists.
  - Verification: Targeted test command reports expected failures.
  - Done 2026-11-21: `tests/unit/matching/eligibility.test.ts` (17 tests) failed first on the missing module, then passed. Also covers route, rotation-aware dimensions, fragile cargo, and listing status.

- [x] **[GREEN] Implement matching and ranking.** Implement pure eligibility, price, CO₂, deadline-margin, and score calculations. Return the top three candidates and closest alternatives when no exact match exists.
  - Acceptance: All eligibility tests pass and ranking respects the selected optimisation preference.
  - Verification: Unit tests for matcher and score calculations.
  - Done 2026-11-21: pure engine in `src/lib/matching/` (eligibility, estimate, score, explain, match). `tests/unit/matching/match-shipment.test.ts` (11 tests) covers price/CO₂/saving/arrival/margin, top three, each optimisation preference, closest alternatives with compromises (mode and deadline only; physical and policy failures are never offered), and the plain-language explanation. Budget is not a hard filter (the spec does not list it); price limits are enforced by policy.

- [x] **[RED/GREEN] Implement policy and approvals.** Write and implement tests for price, value, critical, deadline-margin, dangerous-goods, and no-match flags. Add policy editing for shipper accounts.
  - Acceptance: Any flag prevents automatic booking and creates an approval-ready result.
  - Verification: Policy unit tests and approval integration test.
  - Done 2026-11-21: pure `evaluatePolicy` in `src/lib/policy/evaluate.ts`; `tests/unit/policy/evaluate-policy.test.ts` proves each rule (price, value, critical, deadline margin, dangerous goods, no match) blocks auto-booking on its own with exactly that reason (6-row matrix), plus combined reasons, account thresholds, and inclusive limits. `runAutopilot` (`src/lib/autopilot/run.ts`) creates an approval and never calls the booking service when flagged (`tests/unit/policy/autopilot.test.ts`). Thresholds are edited on the shipper dashboard (`parseThresholds` + `savePolicyAction`).

## Milestone 3: Shipper journey

- [x] **Build shipment intake and Autopilot entry.** Implement client and server validation for every required shipment field, manual mode/optimisation controls, and a `Ship it` action.
  - Acceptance: Valid submissions become `pending_match`; invalid data shows actionable errors.
  - Verification: Form validation tests.
  - Done 2026-11-21: `parseShipmentForm` (`src/lib/shipments/validation.ts`) validates every spec field, is used in the browser for early feedback and on the server as the authority. `submitShipment` stores `pending_match` and runs Autopilot on `Ship it`; "Compare options myself" stores without booking. Tests: `tests/unit/shipments/shipment-validation.test.ts`, `tests/integration/app/shipment-intake.test.ts`.

- [x] **Build comparison and approval UI.** Show ranked manual options with their decisive fields. Show Autopilot reasoning, no-match suggestions, and approval cards that can approve, decline, or select an alternative.
  - Acceptance: The interface reflects the matching and policy result without duplicating core business logic in the client.
  - Verification: End-to-end or integration tests for automatic, approval, and no-match cases.
  - Done 2026-11-21: `/shipper/shipments/[id]` shows ranked options with decisive fields, Autopilot reasoning, no-match alternatives with compromises, and approval cards (approve, choose alternative, decline) via server actions in `src/app/actions/approvals.ts`; rules stay server-side. Tests: `tests/unit/shipments/shipment-views.test.tsx` (automatic, approval, no-match), `tests/integration/app/approval-flow.test.ts`.

- [x] **Add bookings, SolvaPay adapter, and feed cards.** Implement a server-only `@solvapay/server` adapter for sandbox payment authorisation/checkout, plus a testing adapter for authorisation, delivery settlement, provider payout, and failure states. Add atomic capacity reservation, receipt generation/reference, and shipment feed updates.
  - Acceptance: An eligible shipment books once, changes capacity once, and displays payment/receipt details. Failures leave capacity unchanged. The interface does not claim that SolvaPay holds escrowed funds.
  - Verification: Booking transaction and payment-failure integration tests.
  - Done 2026-11-21 with the deterministic testing payment adapter: `src/lib/bookings/service.ts` reserves atomically, authorises, then confirms with payment and receipt references, or releases on payment failure; feed from `src/lib/feed/build.ts`. Tests prove one booking per shipment, no oversell under concurrency, and payment failure leaving capacity unchanged and the booking unconfirmed. Open: the `@solvapay/server` sandbox adapter is a stub (no key, no dependency added); see `docs/handoff.md`.

## Milestone 4: Provider and tracking journey

- [x] **Build provider capacity management.** Implement listing creation/editing, booking view, and remaining-capacity display for road, sea, and air services.
  - Acceptance: A provider-created listing becomes searchable and an instant confirmed booking appears in the provider view.
  - Verification: Provider-to-shipper integration test.
  - Done 2026-11-21: provider dashboard creates, edits, pauses and resumes listings, shows remaining capacity and booked shipments; capacity figures stay server-controlled. `tests/integration/app/provider-listing.test.ts` proves a new listing becomes matchable and a confirmed booking appears to its provider.

- [x] **Build simulated tracking and re-matching.** Add map/timeline updates, provider status actions, delay/cancellation handling, notifications in the feed, and policy-gated rebooking.
  - Acceptance: A disruption creates a visible update and either a compliant replacement booking or an approval card.
  - Verification: Disruption integration test.
  - Done 2026-11-21: provider status actions, timeline, simulated route progress, feed notifications; cancellation or a deadline-threatening delay cancels the booking (capacity restored) and re-runs Autopilot excluding that listing. `tests/integration/app/disruption.test.ts` proves both a compliant rebooking and an approval card. Open: `supabase/migrations/20261121140000_cancel_booking_rpc.sql` not pushed to the hosted project.

- [x] **Build the sustainability summary.** Add monthly/yearly carbon totals, dedicated-vehicle baseline comparison, saved CO₂, and a sustainability score.
  - Acceptance: Values update from confirmed demo bookings and clearly show their period.
  - Verification: Emissions calculation unit tests.
  - Done 2026-11-21: `summariseCarbon` (confirmed and delivered bookings, UTC month and year by collection time, baseline, saved, score) and the Carbon meter on the shipper dashboard. Tests include period boundaries.

## Milestone 5: Demo readiness

- [x] **Create the scripted mock dataset.** Seed one shipper, two providers, six capacity listings across modes, and five shipment scenarios: three automatic bookings, one price approval, and one critical/no-match case.
  - Acceptance: A new reviewer can reset the data and demonstrate every primary flow without manual database changes.
  - Verification: Seed script and end-to-end smoke test.
  - Done 2026-11-21: `src/lib/demo/` (dataset relative to reset time, `seedDemo` through sign-up, repositories, and Autopilot), `POST /api/demo/reset` (disabled in production unless `DEMO_RESET_ENABLED=true`), reset button on the sign-in page and shipper dashboard. `tests/integration/app/demo-smoke.test.ts`: 3 booked, 1 price approval (`price_over_limit` only), 1 critical no-match, capacity changes, demo sign-in, repeatable reset.

- [x] **Validate, secure, and document.** Verify acceptance criteria, responsive layout, theme persistence, account isolation, and no leaked secrets. Update README, architecture, and known limitations.
  - Acceptance: Documented checks pass; all deferred integrations are clearly identified.
  - Verification: Documented lint, test, build, and demo smoke checks.
  - In progress 2026-11-21: lint 0, typecheck 0, `npm test` 212, build OK, `db:verify` 6, `test:integration` 17. Browser end-to-end pass and final limitation review are recorded in `docs/handoff.md`.
  - Done 2026-11-21 (Claude Code): re-ran lint 0, typecheck 0, `npm test` 213 (36 files), build OK, `db:verify` 6, `test:integration` 17. Browser pass on the running dev server, desktop and 375px, dark and light: Approve books with receipt; Decline removes the approval card; new Ship it auto-books; provider Collected saves; provider Cancel triggers automatic rebooking; no-match page renders; no horizontal overflow at 375px; theme persists across pages through `localStorage`. Fixed one copy bug found in the pass (no-match explanation said "-4 h to spare", now "4 h late"; test in `tests/unit/matching/match-shipment.test.ts`). Secrets: `.env.local` is git-ignored, only `.env.example` is tracked, and no keys appear in tracked files or `.next/static`. Deferred integrations are listed in `docs/handoff.md` section 6.
