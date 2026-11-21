import { runAutopilot, type BookingService } from "@/lib/autopilot/run";
import type { Repositories } from "@/lib/db/repositories";
import { AccessError, type AccessContext } from "@/lib/db/types";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/domain/booking";
import type { Id, IsoDateTime } from "@/lib/domain/common";
import type { TrackingEvent, TrackingStatus } from "@/lib/domain/tracking";

export type PostStatusInput = {
  bookingId: Id;
  status: TrackingStatus;
  message?: string;
  /** Revised ETA, used with `delayed`. */
  eta?: IsoDateTime | null;
};

export type RematchOutcome =
  | { rematch: "rebooked"; bookingId: Id }
  | { rematch: "approval_required"; approvalId: Id }
  | { rematch: "booking_failed"; reason: string }
  | { rematch: "not_needed" };

export type PostStatusResult = RematchOutcome & { event: TrackingEvent };

export class TrackingTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrackingTransitionError";
  }
}

const NEXT_STAGE: Partial<Record<TrackingStatus, TrackingStatus>> = {
  booked: "collected",
  collected: "in_transit",
  in_transit: "delivered",
};

/**
 * Statuses a provider may post next, given the booking's history (oldest first).
 * booked → collected → in_transit → delivered; `delayed` and `cancelled` are allowed at any
 * point before delivery. A delay does not change the stage, so progress continues after it.
 */
export function allowedNextStatuses(history: readonly TrackingStatus[]): TrackingStatus[] {
  const stage = [...history].reverse().find((s) => s !== "delayed") ?? "booked";
  if (stage === "delivered" || stage === "cancelled") return [];
  const next = NEXT_STAGE[stage];
  return [...(next ? [next] : []), "delayed", "cancelled"];
}

const DEFAULT_MESSAGES: Record<TrackingStatus, string> = {
  booked: "Booked",
  collected: "Collected from pickup",
  in_transit: "In transit",
  delayed: "Delayed",
  delivered: "Delivered",
  cancelled: "Cancelled by the provider",
};

/**
 * A provider posts a tracking status for one of its bookings.
 *
 * Server-side system action: the shipper context `{ accountId: booking.shipperAccountId }` is
 * derived here from a booking the provider can already see, and is used only to (a) move the
 * shipper's shipment status, (b) write the shipper's audit feed, and (c) re-run Autopilot for the
 * shipment after a disruption. Re-matching goes through `runAutopilot`, so the shipper's policy
 * decides whether to book or raise an approval card; nothing is booked outside policy.
 */
export async function postStatus(
  deps: { repos: Repositories; booking: BookingService },
  providerCtx: AccessContext,
  input: PostStatusInput,
): Promise<PostStatusResult> {
  const { repos } = deps;
  const booking = await repos.bookings.getById(providerCtx, input.bookingId);
  if (!booking || booking.providerAccountId !== providerCtx.accountId) throw new AccessError("Booking not found");
  if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    throw new TrackingTransitionError("This booking is no longer active.");
  }

  const history = (await repos.tracking.listForBooking(providerCtx, booking.id))
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))
    .map((e) => e.status);
  if (!allowedNextStatuses(history).includes(input.status)) {
    throw new TrackingTransitionError(`Cannot mark this booking as ${input.status.replace("_", " ")} now.`);
  }
  if (input.eta && Number.isNaN(Date.parse(input.eta))) throw new TrackingTransitionError("The new ETA is not a valid date.");

  const event = await repos.tracking.append(providerCtx, {
    bookingId: booking.id,
    status: input.status,
    message: input.message?.trim() || DEFAULT_MESSAGES[input.status],
    location: null,
    eta: input.eta ?? null,
  });

  // System action on the shipper's behalf (see above).
  const shipperCtx: AccessContext = { accountId: booking.shipperAccountId };
  const shipment = await repos.shipments.getById(shipperCtx, booking.shipmentId);
  if (!shipment) throw new AccessError("Shipment not found");

  await repos.audit.record(shipperCtx, {
    actorUserId: null,
    action: `tracking.${input.status}`,
    entityType: "booking",
    entityId: booking.id,
    details: { shipmentId: shipment.id, message: event.message, eta: event.eta },
  });

  if (input.status === "in_transit" || input.status === "delivered") {
    await repos.shipments.updateStatus(shipperCtx, shipment.id, input.status);
  }

  const threatensDeadline =
    input.status === "delayed" && !!input.eta && Date.parse(input.eta) > Date.parse(shipment.deadlineAt);
  if (input.status !== "cancelled" && !threatensDeadline) return { event, rematch: "not_needed" };

  // Disruption: release the original booking's capacity and re-run Autopilot without that listing.
  const cancelled = await repos.bookings.cancel(providerCtx, booking.id);
  if (!cancelled.ok) throw new TrackingTransitionError("This booking is no longer active.");
  await repos.shipments.updateStatus(shipperCtx, shipment.id, "pending_match");

  const outcome = await runAutopilot(deps, shipperCtx, shipment.id, {
    excludeListingIds: [booking.capacityListingId],
  });
  const details = { shipmentId: shipment.id, disruptedBookingId: booking.id, trigger: input.status };

  if (outcome.status === "booked") {
    await repos.audit.record(shipperCtx, {
      actorUserId: null,
      action: "autopilot.rebooked",
      entityType: "booking",
      entityId: outcome.bookingId,
      details,
    });
    return { event, rematch: "rebooked", bookingId: outcome.bookingId };
  }
  if (outcome.status === "booking_failed") {
    await repos.audit.record(shipperCtx, {
      actorUserId: null,
      action: "autopilot.rebook_failed",
      entityType: "shipment",
      entityId: shipment.id,
      details: { ...details, reason: outcome.reason },
    });
    return { event, rematch: "booking_failed", reason: outcome.reason };
  }
  await repos.audit.record(shipperCtx, {
    actorUserId: null,
    action: "autopilot.rebook_needs_approval",
    entityType: "approval",
    entityId: outcome.approvalId,
    details: { ...details, reasons: outcome.reasons },
  });
  return { event, rematch: "approval_required", approvalId: outcome.approvalId };
}
