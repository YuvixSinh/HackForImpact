# Claude Code: remaining implementation runbook

Use this as the single ordered runbook after the combined Phase 4 (matching) and Phase 5 (policy/approvals) prompt. First read `AGENTS.md`, `CLAUDE.md`, `docs/spec.md`, `docs/architecture.md`, and `docs/tasks.md`. The task board is authoritative: continue from its first unchecked task and mark tasks done only after acceptance criteria and checks pass.

## Execution rules

- Timebox the work to 90 minutes. Work quickly in small, reviewable changes and give brief progress updates.
- Implement the tasks below in order without waiting for another prompt. For each feature, add a focused failing test first, implement the smallest change, and rerun that test.
- Prioritise one coherent demo path: shipment intake → match or approval → booking → shipment status/tracking. Avoid new dependencies and broad refactors.
- If time expires, stop at a task boundary, update the task board honestly, and report what works, what remains, and exact failed or unrun checks.

## 1. Shipper intake and Autopilot entry

Build shipment intake with server and client validation for every required field in `docs/spec.md`. Add manual transport-mode and optimisation controls and a `Ship it` action. Valid input becomes `pending_match`; invalid input gets clear, actionable errors. Test valid and invalid submissions.

## 2. Comparison and approval UI

Show ranked manual options with their decisive fields. Show Autopilot's recommendation and reasoning, closest alternatives when no exact match exists, and approval cards that can approve, decline, or choose an alternative. Call server-side matching and policy services; keep business rules out of the client. Test automatic, approval-required, and no-match paths.

## 3. Booking, payment adapter, and feed

Connect eligible choices to the atomic reservation RPC and add booking status, receipt references, and shipment feed updates. Put `@solvapay/server` behind a server-only `PaymentAdapter`; use the sandbox only when configured and otherwise use a deterministic testing adapter for authorisation, settlement, payout, and failure. Do not claim SolvaPay holds delivery escrow. Test successful booking, repeated/concurrent reservation, and payment failure; failure must leave capacity unchanged and the booking unconfirmed.

## 4. Provider capacity management

Add provider listing creation/editing, booking visibility, and remaining-capacity display for road, sea, and air. Preserve server-controlled capacity. Test that a provider listing becomes searchable and a confirmed shipper booking appears to its provider.

## 5. Tracking, disruption, and re-matching

Add a simulated tracking timeline/map, provider status actions, delay/cancellation handling, and in-app feed notifications. Re-match only through the existing matching and policy services. A disruption must produce either a compliant replacement booking or an approval card. Test both outcomes.

## 6. Sustainability summary

Show monthly and yearly carbon totals, a dedicated-vehicle baseline comparison, CO₂ saved, and a sustainability score based on confirmed bookings. Test calculations and period boundaries.

## 7. Resettable demo data

Create the Milestone 5 dataset: one shipper, two providers, six listings across modes, and five shipment scenarios (three automatic bookings, one price approval, one critical/no-match). Provide a reset path and smoke test so a reviewer can demonstrate each primary flow without manual database edits.

## 8. Final validation and handoff

Review every acceptance criterion in `docs/spec.md` and `docs/tasks.md`. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run db:verify`, `npm run test:integration`, and `npm run build` when the hosted environment is available. Check the complete demo journey, responsive layout, account isolation, and secret handling. Update README and architecture with actual results and known mock limitations. Report completed tasks, failed/skipped checks, and the fastest next action.
