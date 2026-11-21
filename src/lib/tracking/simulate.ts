import type { Booking } from "@/lib/domain/booking";
import type { TrackingEvent } from "@/lib/domain/tracking";

export type SimulatedPosition = {
  /** 0 at collection, 1 at the destination. */
  progress: number;
  label: string;
};

/** Simulated live position for the route map: linear between collection time and ETA. */
export function simulatePosition(
  booking: Pick<Booking, "status" | "collectionAt" | "eta">,
  now: Date,
): SimulatedPosition {
  if (booking.status === "delivered") return { progress: 1, label: "Delivered" };
  const start = Date.parse(booking.collectionAt);
  const end = Date.parse(booking.eta);
  const t = now.getTime();
  const raw = end > start ? (t - start) / (end - start) : t >= end ? 1 : 0;
  const progress = Math.min(1, Math.max(0, raw));
  if (booking.status === "cancelled" || booking.status === "released") return { progress, label: "Cancelled" };
  if (progress <= 0) return { progress: 0, label: "Awaiting collection" };
  if (progress >= 1) return { progress: 1, label: "Arriving" };
  return { progress, label: `In transit, ${Math.round(progress * 100)}% of the way` };
}

/** Tracking events oldest first (stable for equal timestamps). Does not mutate the input. */
export function timelineFor(events: readonly TrackingEvent[]): TrackingEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => Date.parse(a.event.occurredAt) - Date.parse(b.event.occurredAt) || a.index - b.index)
    .map(({ event }) => event);
}
