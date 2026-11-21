# 0003: Use SolvaPay for authorisation, not delivery escrow

- Status: accepted
- Date: 2026-11-21

## Context

AutoShip needs an agent-controlled payment experience with spending limits, receipts, and an approval path. The original concept also required funds to be held until delivery and then paid to providers.

## Decision

Use `@solvapay/server` only from server routes, behind a payment adapter, for sandbox payment authorisation and checkout. Use a deterministic testing adapter for the demo payment lifecycle. Do not represent SolvaPay as an escrow provider or rely on it for deferred delivery settlement or provider payouts.

## Consequences

The prototype demonstrates policy-controlled payment safely without real money movement. A later marketplace-payment decision, potentially involving Stripe Connect or another provider, is required before delivery settlement or split payouts can be live.
