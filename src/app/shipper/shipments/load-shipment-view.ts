import type { ApprovalView, BookingView, OptionView } from "@/components/shipments/types";
import type { Repositories } from "@/lib/db/repositories";
import type { AccessContext } from "@/lib/db/types";
import type { Booking, BookingStatus } from "@/lib/domain/booking";
import type { CapacityListing } from "@/lib/domain/capacity";
import type { Id } from "@/lib/domain/common";
import type { Shipment } from "@/lib/domain/shipment";
import type { TrackingEvent } from "@/lib/domain/tracking";
import { estimateOption } from "@/lib/matching/estimate";
import { explain } from "@/lib/matching/explain";
import type { MatchCandidate } from "@/lib/matching/match";

export type ShipmentPageView = {
  shipment: Shipment;
  options: OptionView[];
  isExactMatch: boolean;
  explanation: string | null;
  approval: ApprovalView | null;
  booking: BookingView | null;
  /** Raw active booking, for tracking (simulated position) on the page. */
  activeBooking: Booking | null;
  trackingEvents: TrackingEvent[];
  /** Earlier cancelled bookings for this shipment, newest first. */
  cancelledBookings: Booking[];
};

/** Bookings the card shows: holding capacity, or completed. */
const SHOWN_STATUSES: readonly BookingStatus[] = ["reserved", "confirmed", "delivered"];

/** Everything the shipment page shows, read through the viewer's account context. */
export async function loadShipmentView(
  repos: Repositories,
  ctx: AccessContext,
  shipmentId: Id,
): Promise<ShipmentPageView | null> {
  const shipment = await repos.shipments.getById(ctx, shipmentId);
  if (!shipment) return null;

  const [stored, approvals, bookings, factors] = await Promise.all([
    repos.matches.listForShipment(ctx, shipment.id),
    repos.approvals.listForShipment(ctx, shipment.id),
    repos.bookings.listForAccount(ctx),
    repos.emissions.listFactors(),
  ]);
  const ranked = [...stored].sort((a, b) => a.rank - b.rank).slice(0, 3);
  const listings = new Map<Id, CapacityListing | null>();
  await Promise.all(
    ranked.map(async (o) => listings.set(o.capacityListingId, await repos.capacity.getById(ctx, o.capacityListingId))),
  );

  const options: OptionView[] = ranked.map((o) => {
    const listing = listings.get(o.capacityListingId) ?? null;
    const saved = listing ? estimateOption(shipment, listing, factors).co2SavedKg : null;
    return {
      id: o.id,
      rank: o.rank,
      mode: listing?.mode ?? null,
      departureAt: listing?.departureAt ?? null,
      arrivalAt: o.arrivalAt,
      totalPricePence: o.totalPricePence,
      capacityFit: listing ? `${shipment.weightKg} kg of ${listing.remainingCapacityKg} kg free` : null,
      deadlineMarginHours: o.deadlineMarginHours,
      co2Kg: o.co2Kg,
      co2SavedKg: saved,
      isExactMatch: o.isExactMatch,
      compromises: o.compromises,
    };
  });

  const isExactMatch = ranked.length > 0 && ranked.every((o) => o.isExactMatch);
  const candidates: MatchCandidate[] = ranked.map((o, i) => ({
    ...o,
    mode: options[i].mode ?? "road",
    co2SavedKg: options[i].co2SavedKg ?? 0,
    failures: [],
  }));
  const explanation = ranked.length > 0 ? explain(candidates, isExactMatch, shipment.optimisation) : null;

  const pending = approvals.find((a) => a.status === "pending") ?? null;
  const forShipment = bookings
    .filter((b) => b.shipmentId === shipment.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const active = forShipment.filter((b) => SHOWN_STATUSES.includes(b.status)).at(-1) ?? null;
  const [bookedListing, trackingEvents] = active
    ? await Promise.all([
        repos.capacity.getById(ctx, active.capacityListingId),
        repos.tracking.listForBooking(ctx, active.id),
      ])
    : [null, []];

  return {
    shipment,
    options,
    isExactMatch,
    explanation,
    approval: pending
      ? { id: pending.id, reasons: pending.reasons, recommendedOptionId: pending.recommendedOptionId }
      : null,
    booking: active
      ? {
          reference: active.id.slice(0, 8).toUpperCase(),
          mode: bookedListing?.mode ?? null,
          route: bookedListing ? `${bookedListing.origin} → ${bookedListing.destination}` : null,
          pricePence: active.pricePence,
          collectionAt: active.collectionAt,
          eta: active.eta,
          co2Kg: active.co2Kg,
          co2SavedKg: active.co2SavedKg,
          receiptReference: active.receiptReference,
          paymentStatus: active.paymentStatus,
        }
      : null,
    activeBooking: active,
    trackingEvents,
    cancelledBookings: forShipment.filter((b) => b.status === "cancelled").reverse(),
  };
}
