# Handoff for the next agent

Written 2026-11-21 by Claude Code at the end of the Milestone 2–5 build. Read this after `AGENTS.md`, `CLAUDE.md`, `docs/spec.md`, `docs/architecture.md`, and `docs/tasks.md`. `docs/tasks.md` remains the authoritative board; this file explains the current state, how to run and verify it, and what is left.

## 1. State in one paragraph

AutoShip runs end to end locally on in-memory repositories with a demo sign-in. The full shipper journey works: sign up → shipment intake → `Ship it` → matching → policy → automatic booking or approval/no-match → booking with simulated payment and receipt → provider status updates → disruption re-matching → feed and carbon meter. Providers manage capacity and see bookings. A resettable demo dataset covers every primary flow. The Supabase schema, RLS, and reservation RPCs are applied to the linked hosted project and verified, but **the app itself does not yet read or write Supabase** (see section 6).

## 2. Verified results (2026-11-21, all on the same working tree)

| Check | Command (PowerShell: use `npm.cmd` / `npx.cmd`) | Result |
| --- | --- | --- |
| Lint | `npm run lint` | 0 errors, 0 warnings |
| Types | `npm run typecheck` | 0 errors |
| Unit + local integration | `npm test` | 36 files, 213 tests pass |
| Build | `npm run build` | passes; 13 dynamic routes |
| Hosted schema | `npm run db:verify` | 6 tests pass |
| Hosted integration | `npm run test:integration` | 18 tests pass, including `cancel_booking` restoring capacity once |
| Hosted migrations | `npx supabase migration list --linked` | 6 of 6 applied; `20261121140000_cancel_booking_rpc.sql` pushed 2026-11-21 with the owner's OK. `db:verify` now also checks `cancel_booking` (security definer, service role only) |
| Demo reset in the running app | `POST /api/demo/reset` | 5/5 scenarios as expected (3 booked, 1 awaiting approval, 1 no match) |

Browser pass after integration (dev server, desktop width, light theme):
- Demo reset, then sign-in as `shipper@demo.autoship.test`, works.
- The shipper dashboard shows:
  - the Carbon meter (3 bookings, 245.6 kg saved, score 98, month and year);
  - the intake form with Ship it and Compare;
  - the feed (booking, Autopilot and approval events);
  - all 5 shipments with correct statuses;
  - the Settings thresholds form.
- The Rotterdam shipment page shows the recommendation and reasoning, the approval reason "Price is above your automatic booking limit" with Approve and Decline, and the ranked option's decisive fields.

Second browser pass (2026-11-21, dev server on :3001, after all checks above were re-run):

| Flow | Width / theme | Result |
| --- | --- | --- |
| Decline on the Edinburgh no-match shipment | desktop, dark | approval card removed, "Book this option" offered |
| Approve on the Rotterdam shipment | desktop, dark | Booked, reference, receipt `rcpt_test_*`, payment Authorised, tracking |
| New Ship it (London → Manchester, 20 kg, £100 budget) | desktop, dark | auto-booked on road, £26.00 |
| Shipment page and no-match page | 375px, dark and light | no horizontal overflow (`scrollWidth` 375) |
| Shipper dashboard | 375px, light | carbon meter updates (5 bookings after the new ones) |
| Provider: mark Collected | 375px, light | "Status saved", status shows collected |
| Provider: Cancel booking (disruption) | 375px, light | booking cancelled; Autopilot rebooked the shipment on the other London → Manchester listing (new reference, £40.00); capacity updated |
| Provider dashboard | desktop, dark | renders correctly |
| Theme persistence | both | choice saved in `localStorage` (`autoship-theme`) and kept across pages and reloads |

Fixed in this pass: the no-match explanation read "arrives with -4 h to spare". It now reads "arrives 4 h late" (`src/lib/matching/explain.ts`, test in `tests/unit/matching/match-shipment.test.ts`). Lint, typecheck, `npm test` (213) and build were re-run after the fix and pass.

Not checked in the browser: the rebooked shipment as it appears in the shipper feed (covered by tests), the delayed-ETA form, and the signup pages at 375px.

## 3. How to run

1. `npm install` (or `npm ci`).
2. `npm run dev` → http://localhost:3000. Only one `next dev` may run per folder: if it says another is running, use that one or stop it (`taskkill /PID <pid> /F`).
3. Load the demo: on `/signin` press **Reset demo data** (or `POST /api/demo/reset`), then sign in as:
   - `shipper@demo.autoship.test` (Verdant Ceramics Ltd, business shipper)
   - `road@demo.autoship.test` (Northline Haulage, road provider)
   - `freight@demo.autoship.test` (BlueArc Freight, sea and air)
   - Password: `autoship-demo-2030` (demo-only, in `src/lib/demo/seed.ts`; shown on `/signin` outside production).
4. A reset replaces the whole in-memory context: everyone is signed out and all data is reseeded relative to now.
5. `npm start` needs `AUTH_SECRET` (32+ characters) in `.env.local`. `.env.local` already holds the Supabase keys (never print or commit them).

## 4. Demo script (each primary flow)

| Flow (spec §3) | Where to see it |
| --- | --- |
| 1 Automatic booking | Shipper dashboard → shipments "Tableware…", "Returned stock…", "Trade-show display…" are Booked; open one for the booking card, receipt reference, and tracking. Or submit a new London → Manchester shipment with **Ship it**. |
| 2 Approval | "Pallet export to Rotterdam" (£140 > £100 limit): approval card with Approve / Choose alternative / Decline. |
| 3 No exact match | "Critical replacement part to Edinburgh": not fulfilled, closest alternative with compromises, approval card. |
| 4 Manual booking | Submit with **Compare options myself**, then "Book this option" on the shipment page (same policy path; flagged choices become approvals). |
| 5 Provider listing | Sign in as a provider → Add capacity → it becomes matchable; confirmed bookings appear under Booked shipments with remaining capacity. |
| 6 Disruption | Provider → Booked shipments → mark Cancelled (or Delayed past the deadline) → Autopilot re-matches: rebooked or approval card, shown in the shipper feed. |
| Settings | Shipper dashboard → Settings: edit approval thresholds. |
| Sustainability | Shipper dashboard → Carbon meter (month and year, baseline vs actual, saved, score). |

## 5. Code map (where things live)

- **Pure business rules (no React, no DB):** `src/lib/matching/` (eligibility, estimate, score, explain, match), `src/lib/policy/` (evaluate, thresholds), `src/lib/shipments/validation.ts`, `src/lib/providers/listing-validation.ts`, `src/lib/sustainability/summary.ts`, `src/lib/tracking/simulate.ts`, `src/lib/feed/build.ts`.
- **Orchestration:** `src/lib/autopilot/run.ts` (`runAutopilot`: match → store options → policy → book or create approval; flagged results never call booking), `src/lib/shipments/intake.ts`, `src/lib/bookings/service.ts` (reserve → authorise → confirm, or release on payment failure; `bookSelectedOption`, `decideApproval`), `src/lib/tracking/service.ts` (`postStatus`, disruption re-matching), `src/app/shipper/shipments/manual-booking.ts`.
- **Payments:** `src/lib/payments/` — `createPaymentAdapter()` returns the deterministic testing adapter unless `SOLVAPAY_SECRET_KEY` is set; with a key it returns the SolvaPay **sandbox** adapter (`solvapay-adapter.ts`), which debits a prepaid credit balance over the REST API. Settlement and payout stay simulated (ADR 0003: no escrow). Setup is in README "SolvaPay sandbox".
- **Data:** `src/lib/db/repositories.ts` (interfaces, all scoped by `AccessContext`), `src/lib/db/memory/` (in-memory implementation used by the app), `src/lib/db/supabase/` (only the reservation RPC gateway). SQL in `supabase/migrations/`.
- **Server wiring:** `src/lib/server/app-context.ts` (repos, demo users, auth), `src/lib/server/services.ts` (`getServices()` → repos, payments, booking; one payment adapter per context), `src/lib/server/session.ts`, `src/lib/server/account-data.ts`, `src/lib/server/demo-reset.ts`.
- **Routes and actions:** `src/app/` (`/`, `/signup[/role]`, `/signin`, `/shipper`, `/shipper/shipments/[id]`, `/provider`, `/api/shipments`, `/api/bookings`, `/api/demo/reset`); server actions in `src/app/actions/` (auth, shipments, approvals, provider, tracking).
- **UI:** `src/components/` (`shipper/`, `shipments/`, `provider/`, `tracking/`, `dashboards/`, `auth/`, `demo/`), theme in `src/app/globals.css` (black/white with palette accents `accent-sage/forest/bronze/amber`, utilities `glass`, `eyebrow`, `rise-in`), animated background `background-field.tsx` + `route-field.ts` (respects reduced motion).
- **Tests:** `tests/unit/**`, `tests/integration/app/**` (local, in `npm test`), `tests/integration/hosted/**` and `tests/db/**` (hosted Supabase), shared `tests/contracts/reservation-contract.ts`, fixtures in `tests/fixtures/`.

## 6. Known gaps and limitations (be honest about these in demos)

1. **App data is in memory.** It resets on restart and is not shared between serverless instances, so a Vercel deploy would lose data between requests. Supabase-backed repositories for everything except the reservation RPC gateway do not exist yet.
2. **Demo sign-in, not Supabase Auth** (ADR 0004, accepted for the prototype). No email verification, password reset, or rate limiting. Keep it until Supabase Auth and persistent repositories can be introduced together.
3. **SolvaPay:** the sandbox adapter is implemented and unit-tested against a fake `fetch`, but **has never been run against the live sandbox**. It uses one configured customer for every shipper, at most 100,000 units per booking, USD-pegged credits, and no reversal if confirmation fails after a debit. No escrow; settlement and payout are simulated.
4. **`cancel_booking` RPC is on the hosted project but unused by the app.** The app cancels through the in-memory repository. A hosted integration test now verifies the RPC cancels once and restores capacity exactly once; wire it into the app when a Supabase booking repository is introduced.
5. **Times are UTC.** Forms label `datetime-local` inputs "(UTC)". The tracking status form's delayed-ETA input is read in the server's local zone (minor inconsistency).
6. **Delivered bookings** keep booking status `confirmed` (shipment becomes `delivered`); a delay's new ETA is stored on the tracking event, not the booking.
7. **Budget** is collected but is not a hard filter (the spec does not list it); price limits come from approval policy.
8. **Multi-leg routes** are not matched yet (single listing per option); routes match on exact origin/destination text, case-insensitive.
9. **Demo reset route** has no auth. It is disabled in production unless `DEMO_RESET_ENABLED=true`; never set that on a public deploy.
10. **Supabase project label:** the CLI reports the linked project as environment `production`. The owner authorized prototype schema and test-data use; never use it for real business data.

## 7. Next actions, in order

1. Done 2026-11-21: "Validate, secure, and document" is ticked; every task in `docs/tasks.md` is now checked. Results are in section 2.
2. Resolved by Codex (ADR 0004): keep demo sign-in for the in-memory prototype; plan Supabase Auth and persistent repositories together before public or multi-user deployment.
3. Done 2026-11-21: `cancel_booking` migration is applied and listed among service-role-only RPCs. `db:verify` passes 6 tests; `test:integration` passes 18 tests, including one-time capacity restoration.
4. Done 2026-11-21 (not yet run live): SolvaPay sandbox adapter behind `PaymentAdapter`. Next: the owner adds `SOLVAPAY_SECRET_KEY`, `SOLVAPAY_PRODUCT_REF`, and `SOLVAPAY_CUSTOMER_REF` to `.env.local`, then makes one sandbox booking in the app. Planning questions for Codex: the prepaid-credit flow vs. browser checkout with payment intents; per-account SolvaPay customers; refunding a debit when confirmation fails; whether to adopt `@solvapay/server` instead of plain REST.
5. Resolved by Codex in ADR 0005: keep the explicit booking-failure outcome, retain the shipper manual-booking use case in its current server-side app module, keep the max-item-weight validation, treat the short booking reference as display-only, and retain non-claiming decorative labels.

## 8. Working rules that saved time here

- One agent per set of files. Pure logic in `src/lib/*` is test-first and framework-free; pages compose server data into presentational components through slots/props (see `ShipperDashboard`).
- `docs/tasks.md` uses CRLF line endings; edit it with a CRLF-aware tool or the Edit tool, not `"\n\n"`-based scripts.
- PowerShell blocks `npm.ps1`; use `npm.cmd` / `npx.cmd`.
- Do not commit unless the owner asks; the owner commits themselves.
