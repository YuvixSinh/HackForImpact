# Handoff for the next agent

Written 2026-11-21 by Claude Code at the end of the Milestone 2–5 build. Read this after `AGENTS.md`, `CLAUDE.md`, `docs/spec.md`, `docs/architecture.md`, and `docs/tasks.md`. `docs/tasks.md` remains the authoritative board; this file explains the current state, how to run and verify it, and what is left.

## 1. State in one paragraph

AutoShip runs end to end locally on in-memory repositories with a demo sign-in. The full shipper journey works: sign up → shipment intake → `Ship it` → matching → policy → automatic booking or approval/no-match → booking with simulated payment and receipt → provider status updates → disruption re-matching → feed and carbon meter. Providers manage capacity and see bookings. A resettable demo dataset covers every primary flow. The Supabase schema, RLS, and reservation RPCs are applied to the linked hosted project and verified, but **the app itself does not yet read or write Supabase** (see section 6).

## 2. Verified results (2026-11-21, all on the same working tree)

| Check | Command (PowerShell: use `npm.cmd` / `npx.cmd`) | Result |
| --- | --- | --- |
| Lint | `npm run lint` | 0 errors, 0 warnings |
| Types | `npm run typecheck` | 0 errors |
| Unit + local integration | `npm test` | 36 files, 212 tests pass |
| Build | `npm run build` | passes; 13 dynamic routes |
| Hosted schema | `npm run db:verify` | 6 tests pass |
| Hosted integration | `npm run test:integration` | 17 tests pass |
| Hosted migrations | `npx supabase migration list --linked` | 5 of 6 applied; `20261121140000_cancel_booking_rpc.sql` is **local only, not pushed** |
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

**Not checked in the browser yet:**
- clicking Approve or Decline;
- a new Ship it submission;
- provider status changes and disruption;
- the no-match page;
- 375px width and dark theme for the new pages.

These flows are all covered by the tests in section 2.

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
- **Payments:** `src/lib/payments/` — `createPaymentAdapter()` returns the deterministic testing adapter unless `SOLVAPAY_SECRET_KEY` is set; the SolvaPay adapter is a **stub that throws** (ADR 0003: no escrow).
- **Data:** `src/lib/db/repositories.ts` (interfaces, all scoped by `AccessContext`), `src/lib/db/memory/` (in-memory implementation used by the app), `src/lib/db/supabase/` (only the reservation RPC gateway). SQL in `supabase/migrations/`.
- **Server wiring:** `src/lib/server/app-context.ts` (repos, demo users, auth), `src/lib/server/services.ts` (`getServices()` → repos, payments, booking; one payment adapter per context), `src/lib/server/session.ts`, `src/lib/server/account-data.ts`, `src/lib/server/demo-reset.ts`.
- **Routes and actions:** `src/app/` (`/`, `/signup[/role]`, `/signin`, `/shipper`, `/shipper/shipments/[id]`, `/provider`, `/api/shipments`, `/api/bookings`, `/api/demo/reset`); server actions in `src/app/actions/` (auth, shipments, approvals, provider, tracking).
- **UI:** `src/components/` (`shipper/`, `shipments/`, `provider/`, `tracking/`, `dashboards/`, `auth/`, `demo/`), theme in `src/app/globals.css` (black/white with palette accents `accent-sage/forest/bronze/amber`, utilities `glass`, `eyebrow`, `rise-in`), animated background `background-field.tsx` + `route-field.ts` (respects reduced motion).
- **Tests:** `tests/unit/**`, `tests/integration/app/**` (local, in `npm test`), `tests/integration/hosted/**` and `tests/db/**` (hosted Supabase), shared `tests/contracts/reservation-contract.ts`, fixtures in `tests/fixtures/`.

## 6. Known gaps and limitations (be honest about these in demos)

1. **App data is in memory.** It resets on restart and is not shared between serverless instances, so a Vercel deploy would lose data between requests. Supabase-backed repositories for everything except the reservation RPC gateway do not exist yet.
2. **Demo sign-in, not Supabase Auth** (ADR 0004, still *proposed*). No email verification, password reset, or rate limiting.
3. **SolvaPay:** testing adapter only; the sandbox adapter is a stub. No escrow; settlement and payout are simulated.
4. **`cancel_booking` migration not pushed** to the hosted project. In-memory cancel works and is tested.
5. **Times are UTC.** Forms label `datetime-local` inputs "(UTC)". The tracking status form's delayed-ETA input is read in the server's local zone (minor inconsistency).
6. **Delivered bookings** keep booking status `confirmed` (shipment becomes `delivered`); a delay's new ETA is stored on the tracking event, not the booking.
7. **Budget** is collected but is not a hard filter (the spec does not list it); price limits come from approval policy.
8. **Multi-leg routes** are not matched yet (single listing per option); routes match on exact origin/destination text, case-insensitive.
9. **Demo reset route** has no auth. It is disabled in production unless `DEMO_RESET_ENABLED=true`; never set that on a public deploy.
10. **Supabase project label:** the CLI reports the linked project as environment `production`. Treat it as the dev project only after confirming with the owner.

## 7. Next actions, in order

1. Finish `docs/tasks.md` "Validate, secure, and document". It is the only unchecked task; every other task through Milestone 5 is ticked with notes.
   - Do the browser pass for the unchecked items in section 2, at desktop and 375px, in both themes.
   - Record the results, then tick the task.
   - The last change was the shipper carbon panel title, which shows "Sustainability" when the meter is present. Lint, typecheck and `npm test` (212) were re-run after it and pass; build was not re-run after that one-line change.
2. Decide with Codex: accept ADR 0004 or schedule Supabase Auth + Supabase repositories (needs `@supabase/ssr`, a dependency decision).
3. With the owner's OK, push `20261121140000_cancel_booking_rpc.sql` (`npx supabase db push --linked`), add it to `SERVICE_ONLY_RPCS` in `tests/db/schema.verify.test.ts`, and rerun `npm run db:verify` and `npm run test:integration`.
4. Implement the SolvaPay sandbox adapter behind `PaymentAdapter` once a sandbox key exists (`SOLVAPAY_SECRET_KEY`, server-only).
5. Planning questions already raised by agents: accept the extra `rematch: "booking_failed"` outcome; where the manual-booking policy check should live (`manual-booking.ts` vs `src/lib/bookings`); the added rule "max item weight ≤ total capacity"; booking reference = first 8 characters of the id; decorative copy added by the restyle (eyebrow labels).

## 8. Working rules that saved time here

- One agent per set of files. Pure logic in `src/lib/*` is test-first and framework-free; pages compose server data into presentational components through slots/props (see `ShipperDashboard`).
- `docs/tasks.md` uses CRLF line endings; edit it with a CRLF-aware tool or the Edit tool, not `"\n\n"`-based scripts.
- PowerShell blocks `npm.ps1`; use `npm.cmd` / `npx.cmd`.
- Do not commit unless the owner asks; the owner commits themselves.
