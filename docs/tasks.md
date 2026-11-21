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

- [x] **Create account entry and role-specific shells.** Add a clear sign-in/sign-up path for business shippers, individual shippers, and providers. Route each role to its own dashboard shell.
  - Acceptance: A demo user can enter either dashboard and cannot view another account's records.
  - Verification: Auth/access integration test.
  - Done 2026-11-21 with the demo sign-in fallback (ADR 0004, proposed). `tests/integration/app/account-isolation.test.ts` (4 tests) runs through the real route handlers and session cookie: another account gets 404 for a shipment or booking, missing or forged sessions get 401, and lists contain only the caller's records. `npm test` (61 tests), lint, typecheck, and build pass. In the browser, all three sign-up paths work, sign-in and sign-out work, a wrong password gets a generic error, dashboards redirect visitors and the wrong account kind, and an unknown role gives 404. Open: real Supabase Auth and Supabase-backed repositories remain future work; task 2 only verifies the schema and hosted reservation/RLS contracts.

## Milestone 2: Matching and policy engine

- [ ] **[RED] Specify capacity eligibility.** Write focused tests for ready time, deadline, mode preference, dimensions, weight, remaining capacity, and cargo restrictions.
  - Acceptance: Tests fail before the matcher exists.
  - Verification: Targeted test command reports expected failures.

- [ ] **[GREEN] Implement matching and ranking.** Implement pure eligibility, price, CO₂, deadline-margin, and score calculations. Return the top three candidates and closest alternatives when no exact match exists.
  - Acceptance: All eligibility tests pass and ranking respects the selected optimisation preference.
  - Verification: Unit tests for matcher and score calculations.

- [ ] **[RED/GREEN] Implement policy and approvals.** Write and implement tests for price, value, critical, deadline-margin, dangerous-goods, and no-match flags. Add policy editing for shipper accounts.
  - Acceptance: Any flag prevents automatic booking and creates an approval-ready result.
  - Verification: Policy unit tests and approval integration test.

## Milestone 3: Shipper journey

- [ ] **Build shipment intake and Autopilot entry.** Implement client and server validation for every required shipment field, manual mode/optimisation controls, and a `Ship it` action.
  - Acceptance: Valid submissions become `pending_match`; invalid data shows actionable errors.
  - Verification: Form validation tests.

- [ ] **Build comparison and approval UI.** Show ranked manual options with their decisive fields. Show Autopilot reasoning, no-match suggestions, and approval cards that can approve, decline, or select an alternative.
  - Acceptance: The interface reflects the matching and policy result without duplicating core business logic in the client.
  - Verification: End-to-end or integration tests for automatic, approval, and no-match cases.

- [ ] **Add bookings, SolvaPay adapter, and feed cards.** Implement a server-only `@solvapay/server` adapter for sandbox payment authorisation/checkout, plus a testing adapter for authorisation, delivery settlement, provider payout, and failure states. Add atomic capacity reservation, receipt generation/reference, and shipment feed updates.
  - Acceptance: An eligible shipment books once, changes capacity once, and displays payment/receipt details. Failures leave capacity unchanged. The interface does not claim that SolvaPay holds escrowed funds.
  - Verification: Booking transaction and payment-failure integration tests.

## Milestone 4: Provider and tracking journey

- [ ] **Build provider capacity management.** Implement listing creation/editing, booking view, and remaining-capacity display for road, sea, and air services.
  - Acceptance: A provider-created listing becomes searchable and an instant confirmed booking appears in the provider view.
  - Verification: Provider-to-shipper integration test.

- [ ] **Build simulated tracking and re-matching.** Add map/timeline updates, provider status actions, delay/cancellation handling, notifications in the feed, and policy-gated rebooking.
  - Acceptance: A disruption creates a visible update and either a compliant replacement booking or an approval card.
  - Verification: Disruption integration test.

- [ ] **Build the sustainability summary.** Add monthly/yearly carbon totals, dedicated-vehicle baseline comparison, saved CO₂, and a sustainability score.
  - Acceptance: Values update from confirmed demo bookings and clearly show their period.
  - Verification: Emissions calculation unit tests.

## Milestone 5: Demo readiness

- [ ] **Create the scripted mock dataset.** Seed one shipper, two providers, six capacity listings across modes, and five shipment scenarios: three automatic bookings, one price approval, and one critical/no-match case.
  - Acceptance: A new reviewer can reset the data and demonstrate every primary flow without manual database changes.
  - Verification: Seed script and end-to-end smoke test.

- [ ] **Validate, secure, and document.** Verify acceptance criteria, responsive layout, theme persistence, account isolation, and no leaked secrets. Update README, architecture, and known limitations.
  - Acceptance: Documented checks pass; all deferred integrations are clearly identified.
  - Verification: Documented lint, test, build, and demo smoke checks.
