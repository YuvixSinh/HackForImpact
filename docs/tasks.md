# AutoShip work plan

Complete tasks in this order. Claude Code must read the linked specification and assigned task before editing code.

## Milestone 1: Foundation

- [ ] **Set up the application shell.** Create the Next.js TypeScript and Tailwind application, add responsive light/dark themes, and record install, test, lint, build, and run commands in `README.md`.
  - Acceptance: The app starts locally, switches theme, and passes its baseline checks.
  - Verification: Run the documented lint, test, and build commands.

- [ ] **Establish data boundaries.** Add typed domain models, Supabase schema/migrations and row-level-security policies. Use in-memory repositories only if Supabase setup would block the demo, with the same repository interface. Create only the minimum test fixtures needed for early tests; leave the scripted mock-demo dataset until Milestone 5.
  - Acceptance: Models and repositories support all primary flows without relying on hand-edited data.
  - Verification: Schema check and automated repository tests.

- [ ] **Create account entry and role-specific shells.** Add a clear sign-in/sign-up path for business shippers, individual shippers, and providers. Route each role to its own dashboard shell.
  - Acceptance: A demo user can enter either dashboard and cannot view another account's records.
  - Verification: Auth/access integration test.

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

- [ ] **Add bookings, SolvaPay adapter, and feed cards.** Implement a server-only SolvaPay adapter with sandbox and testing modes, atomic capacity reservation, receipt generation/reference, and shipment feed updates.
  - Acceptance: An eligible shipment books once, changes capacity once, and displays payment/receipt details. Failures leave capacity unchanged.
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
