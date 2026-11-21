import type { Booking } from "@/lib/domain/booking";
import type { TrackingStatus } from "@/lib/domain/tracking";
import { allowedNextStatuses } from "@/lib/tracking/service";
import { StatusActions } from "../tracking/status-actions";
import { formatDateTime, formatNumber, formatPence, shortId } from "./format";

type BookedShipmentsProps = {
  bookings: Booking[];
  /** Tracking status history per booking id, oldest first. */
  tracking?: Record<string, TrackingStatus[]>;
  /** Render provider status controls for confirmed bookings. */
  showActions?: boolean;
};

export function BookedShipments({ bookings, tracking = {}, showActions = false }: BookedShipmentsProps) {
  if (bookings.length === 0) {
    return <p className="text-sm text-ink-muted">No shipments booked on your capacity yet.</p>;
  }
  return (
    <div>
      <div aria-hidden="true" className="eyebrow mb-2 hidden grid-cols-6 gap-x-4 sm:grid">
        <span>Reference</span>
        <span>Weight</span>
        <span>Price</span>
        <span>Collection</span>
        <span>ETA</span>
        <span className="text-right">Status</span>
      </div>
      <ul className="divide-y divide-line">
        {bookings.map((booking) => {
          const history = tracking[booking.id] ?? [];
          const latest = history.at(-1);
          return (
            <li key={booking.id} className="space-y-3 py-3 first:pt-0 last:pb-0">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-6 sm:items-center">
                <span className="font-mono text-xs text-ink" title={booking.id}>
                  #{shortId(booking.id)}
                </span>
                <span className="text-right tabular-nums sm:text-left">{formatNumber(booking.reservedWeightKg)} kg</span>
                <span className="tabular-nums">{formatPence(booking.pricePence)}</span>
                <span className="text-right text-xs text-ink-muted tabular-nums sm:text-left">
                  <span className="sm:hidden">Collect </span>
                  {formatDateTime(booking.collectionAt)}
                </span>
                <span className="text-xs text-ink-muted tabular-nums">
                  <span className="sm:hidden">ETA </span>
                  {formatDateTime(booking.eta)}
                </span>
                <span className="eyebrow text-right">
                  {booking.status}
                  {latest ? <span className="block normal-case text-ink-muted">{latest.replace("_", " ")}</span> : null}
                </span>
              </div>
              {showActions && booking.status === "confirmed" ? (
                <StatusActions bookingId={booking.id} allowed={allowedNextStatuses(history)} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
