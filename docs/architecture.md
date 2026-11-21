# AutoShip architecture

## System overview

AutoShip is a Next.js TypeScript application with a web client and server-side route handlers. Supabase supplies hosted Postgres storage; the current app uses documented demo authentication while real Supabase Auth remains future work. Local development begins with in-memory repositories and switches to hosted Supabase storage when credentials are supplied. The prototype uses interfaces around matching, payments, tracking, routing, and notifications so deterministic mock implementations can be replaced without changing product flows.

```mermaid
flowchart LR
  S[Shipper dashboard] --> A[Next.js API]
  P[Provider dashboard] --> A
  A --> D[(Supabase Postgres)]
  A --> M[Matching and policy engine]
  M --> C[Capacity repository]
  M --> Pay[SolvaPay adapter]
  Pay --> B[Booking service]
  B --> T[Tracking service]
  B --> F[Shipment feed]
```

## Components

| Area | Responsibility | Depends on |
| --- | --- | --- |
| `src/app/` | Pages, route handlers, authentication boundaries, theme | Next.js, `src/lib/auth/` |
| `src/lib/auth/` | Demo sign-in (ADR 0004, accepted for the prototype): role mapping, validation, scrypt passwords, HMAC-signed session tokens, `AuthService` | repositories |
| `src/lib/server/` | Server-only: app context (repositories, demo users, auth), session cookie, and the account-scoped data access layer used by pages and route handlers | `src/lib/auth/`, `src/lib/db/` |
| `src/components/` | Shared UI: site header, theme toggle, dashboard placeholders | `src/lib/theme/` |
| `src/lib/theme/` | Theme resolution/persistence (`localStorage` key `autoship-theme`) and the inline `<head>` script that applies it before first paint | none |
| `src/features/shipments/` | Form validation, shipment display, manual comparison | shipment service |
| `src/features/providers/` | Capacity listing and provider bookings | capacity service |
| `src/lib/matching/` | Eligibility filters, price/CO₂ calculations, score and ranked matches | shipment and capacity records |
| `src/lib/policy/` | Flag rules, approval and auto-book decisions | organisation policy |
| `src/lib/bookings/` | Atomic reservation, booking lifecycle, receipts | capacity and payment adapters |
| `src/lib/integrations/` | SolvaPay server adapter, payment simulator, routing, tracking, and notification adapters | external services |
| `src/lib/domain/` | Typed domain records shared by every layer | none |
| `src/lib/db/` | Repository interfaces scoped by `AccessContext` (the acting account); in-memory implementation (`memory/`); server-only Supabase adapters (`supabase/`, currently the reservation RPC gateway) | Supabase |
| `supabase/migrations/` | Schema, row-level-security policies, explicit API-role grants, `create_account`, reservation RPCs, and `cancel_booking` | Supabase Postgres |
| `tests/` | Unit tests for pure rules and integration tests for flows | application services |

## Data model

- **Account/organisation and user:** Account type is shipper or provider; a shipper account can be business or individual.
- **Shipment:** Description, dimensions, weight, value, cargo handling flags, locations, times, budget, priority, mode and optimisation preferences, and lifecycle status.
- **Capacity listing:** Provider, mode, route, availability, capacity, cargo restrictions, price, CO₂ estimate, and status.
- **Match option:** Shipment and capacity identifiers, calculated price, arrival, deadline margin, CO₂, score, and rank.
- **Policy/approval:** Account-specific automatic price, value, and deadline limits plus approval status and selected option.
- **Booking/tracking:** Reserved capacity, payment state, receipt reference, lifecycle events, and audit metadata.

All account-scoped records include an account identifier. Database row-level security must restrict records to their owner account, except for the controlled matching query that reads available provider listings.

## Important flows

### Account entry and isolation (current: demo sign-in)

1. `/` and `/signup` offer three paths: `/signup/business-shipper`, `/signup/individual-shipper`, `/signup/provider`. A server action validates input, creates the user and account (shipper + business/individual, or provider), and sets an HttpOnly signed session cookie.
2. Each request resolves the viewer on the server: valid signature, unexpired, known user, and current membership of the claimed account.
3. `/shipper` and `/provider` redirect visitors to `/signin` and the other account kind to its own dashboard.
4. Pages and the read-only `/api/shipments` and `/api/bookings` handlers read only through `src/lib/server/account-data.ts`, which scopes repositories to the viewer's account. Another account's record returns 404 and a missing or invalid session returns 401.

### Autopilot booking

1. A shipper submits validated shipment data; the server persists it as `pending_match`.
2. The matching service filters available capacity and ranks up to three options.
3. The policy service evaluates the chosen option and shipment flags.
4. A flagged result creates an approval request. An unflagged result calls the SolvaPay adapter and books within a transaction that decrements capacity.
5. The booking service writes a receipt reference, a feed event, and initial tracking event.

### Disruption handling

The provider posts a delayed or cancelled tracking event. The server updates ETA or status, re-runs matching, and uses the same policy path to rebook automatically or create an approval request.

## Integrations and MVP substitutions

| Capability | Prototype | Replacement later |
| --- | --- | --- |
| Capacity | Seeded and provider-created listings | Provider databases and freight exchanges |
| Routes and distance | Fixed route distances | OpenRouteService or Google Distance Matrix |
| Payment authorisation/checkout | SolvaPay sandbox REST API (`fetch`, no SDK dependency): prepaid credit balance check, then a usage debit; testing adapter fallback when no key is set | Production SolvaPay configuration, per-account customer mapping |
| Delivery settlement and provider payout | Deterministic simulated adapter | Marketplace-payment provider/Stripe Connect design |
| Tracking | Simulated timeline and map location | Telematics/GPS feed |
| Notifications | In-app feed | Resend email and in-app preferences |
| Imports | Mock connection/import entry point | CSV/Excel, Google Sheets, email, and API intake |

## Runtime and operations

- Local development uses the in-memory repository unless `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY` are present.
- Reservation RPCs are executable by the service role only. The Next.js server resolves the shipper account from the session and passes the price and CO₂ computed by the matching engine, so browsers cannot set booking prices. Reservation is a conditional capacity decrement under row locks, with a unique index allowing one `reserved`/`confirmed` booking per shipment. The in-memory repository passes the same contract suite (`tests/contracts/reservation-contract.ts`).
- Row-level security: account members see their own records; bookings and tracking events are visible to both the shipper and provider accounts; active listings with remaining capacity and emissions factors are readable by any signed-in user; providers cannot edit capacity figures directly; anonymous visitors get no table access. A linked hosted Supabase project is the integration-test environment; local Docker is not required. The current linked project is CLI-labeled `production` and is used for this prototype's test data.
- Task 2 applies migrations to the linked project using `npx supabase db push --remote --yes`, then runs the committed database-verification script and integration tests. These checks, rather than SQL review alone, verify migration application, API-role grants, row-level security, and reservation semantics.
- Environment variables contain Supabase and SolvaPay server credentials only; commit an `.env.example` with variable names and no secrets. Service-role and SolvaPay keys must never use a `NEXT_PUBLIC_` prefix.
- Vercel hosts the app and API. Seed scripts create deterministic demo accounts, trips, shipments, factors, and tracking events.
- The MVP starts an Autopilot run on user submission. Scheduled matching and background jobs come after the complete synchronous demo flow is reliable.
- Errors from payment and booking steps must leave no capacity reservation behind.

## Risks and boundaries

- SolvaPay is not an escrow service and does not hold funds. Payment authorisation/checkout and settlement/payout are distinct adapter responsibilities; real marketplace settlement requires a later decision.
- Real payment, carrier, and personal data are not appropriate for demo credentials. Keep them behind adapters and use only sandbox/mock data.
- Multi-leg routing is supported in the data/model design; the first matching implementation may use a single seeded listing per option while retaining a route-leg extension point.
- The no-match and approval states are product outcomes, not errors, and must be demonstrated deliberately with seeded scenarios.
