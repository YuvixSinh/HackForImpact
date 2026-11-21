import type { ReactNode } from "react";
import { formatDateTime, formatKg, formatPence, MODE_LABEL } from "./format";
import type { BookingView } from "./types";

const PAYMENT_LABEL: Record<BookingView["paymentStatus"], string> = {
  pending: "Pending",
  authorised: "Authorised",
  failed: "Failed",
  settled: "Settled",
  refunded: "Refunded",
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-b border-line py-2 last:border-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="font-mono text-sm tabular-nums text-ink">{children}</dd>
    </div>
  );
}

/** Booking confirmation for a booked shipment. Payment is a sandbox simulation (ADR 0003). */
export function BookingCard({ booking }: { booking: BookingView }) {
  return (
    <section aria-labelledby="booking-heading" className="glass rise-in rounded-xl border border-brand p-5">
      <p className="eyebrow">Booking</p>
      <h2 id="booking-heading" className="mt-1 text-lg font-semibold text-ink">
        Booked
      </h2>
      <dl className="mt-3">
        <Row label="Reference">{booking.reference}</Row>
        <Row label="Transport">
          {booking.mode ? MODE_LABEL[booking.mode] : "—"}
          {booking.route ? ` · ${booking.route}` : ""}
        </Row>
        <Row label="Price">{formatPence(booking.pricePence)}</Row>
        <Row label="Collection">{formatDateTime(booking.collectionAt)}</Row>
        <Row label="ETA">{formatDateTime(booking.eta)}</Row>
        <Row label="CO₂">{formatKg(booking.co2Kg)}</Row>
        <Row label="CO₂ saved vs dedicated vehicle">
          <span className="text-accent-sage">{formatKg(booking.co2SavedKg)}</span>
        </Row>
        <Row label="Receipt reference">{booking.receiptReference ?? "Not issued yet"}</Row>
        <Row label="Payment status">{PAYMENT_LABEL[booking.paymentStatus]}</Row>
      </dl>
      <p className="mt-3 text-xs text-ink-muted">
        Payment via SolvaPay (sandbox/testing). No real money moves, and funds are not held on your behalf.
      </p>
    </section>
  );
}
