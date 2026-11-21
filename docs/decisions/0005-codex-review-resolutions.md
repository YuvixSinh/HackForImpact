# 0005: Resolve prototype review questions

- Status: accepted
- Date: 2026-11-21
- Owner: Codex

## Decisions

1. Keep `booking_failed` and `rematch: "booking_failed"` as explicit outcomes. They let the UI/feed state that automatic booking or re-matching failed without pretending the shipment was booked or silently retrying.
2. Keep manual selection and its policy check in `src/app/shipper/shipments/manual-booking.ts` for this prototype. It is the server-side use case for the shipper action and delegates policy evaluation and actual reservation to shared services. Move it only if another entry point needs to reuse that workflow.
3. Keep provider validation that `maxItemWeightKg` cannot exceed `totalCapacityKg`. It rejects a listing whose advertised single-item limit could never fit in its total capacity.
4. Keep the first eight hexadecimal ID characters as a display reference. It is a short label only; IDs remain the lookup and authorization key.
5. Keep eyebrow labels and short decorative copy as presentation details. They must not imply unimplemented services or unsupported shipment facts.

## Consequences

No new runtime dependency or behavior change is needed for these decisions. The current app remains an in-memory prototype with demo sign-in; Supabase-backed app repositories and real Supabase Auth are deferred together. The hosted `cancel_booking` RPC is schema infrastructure only until a Supabase booking repository is introduced; the hosted test verifies its cancellation and capacity-restoration behavior.
