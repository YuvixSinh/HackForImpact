import type { BookingService } from "@/lib/autopilot/run";
import type { Repositories } from "@/lib/db/repositories";
import type { AccessContext } from "@/lib/db/types";
import type { Id } from "@/lib/domain/common";
import { estimateOption } from "@/lib/matching/estimate";
import type { PaymentAdapter } from "@/lib/payments/types";

export type BookingDeps = { repos: Repositories; payments: PaymentAdapter };
export type BookResult = { ok: true; bookingId: Id } | { ok: false; reason: string };

/** Reserve capacity atomically, authorise payment, then confirm, or release on payment failure. */
export function createBookingService({ repos, payments }: BookingDeps): BookingService {
  return {
    async book(ctx, { shipment, option, candidate }) {
      const reservation = await repos.bookings.reserve(ctx, {
        shipmentId: shipment.id,
        listingId: candidate.capacityListingId,
        pricePence: candidate.totalPricePence,
        co2Kg: candidate.co2Kg,
        co2SavedKg: candidate.co2SavedKg,
        matchOptionId: option.id,
      });
      if (!reservation.ok) return { ok: false, reason: reservation.reason };
      const booking = reservation.booking;

      let payment;
      try {
        payment = await payments.authorise({
          bookingId: booking.id,
          amountPence: booking.pricePence,
          shipperAccountId: booking.shipperAccountId,
          providerAccountId: booking.providerAccountId,
          description: `AutoShip booking ${booking.id}: ${shipment.pickupLocation} to ${shipment.destinationLocation}`,
        });
      } catch (error) {
        payment = { ok: false as const, reason: error instanceof Error ? error.message : "payment_error" };
      }

      if (!payment.ok) {
        await repos.bookings.release(ctx, booking.id);
        await repos.audit.record(ctx, {
          actorUserId: null,
          action: "payment.failed",
          entityType: "booking",
          entityId: booking.id,
          details: { reason: payment.reason, provider: payments.provider },
        });
        return { ok: false, reason: `payment_failed: ${payment.reason}` };
      }

      const confirmed = await repos.bookings.confirm(ctx, booking.id, {
        paymentReference: payment.paymentReference,
        receiptReference: payment.receiptReference,
      });
      if (!confirmed.ok) return { ok: false, reason: confirmed.reason };
      return { ok: true, bookingId: booking.id };
    },
  };
}

/** Books a stored match option (manual choice or approved request) after re-validating its listing. */
export async function bookSelectedOption(
  deps: BookingDeps & { booking?: BookingService },
  ctx: AccessContext,
  input: { shipmentId: Id; optionId: Id },
): Promise<BookResult> {
  const { repos } = deps;
  const shipment = await repos.shipments.getById(ctx, input.shipmentId);
  if (!shipment) return { ok: false, reason: "shipment_not_found" };
  const option = (await repos.matches.listForShipment(ctx, shipment.id)).find((o) => o.id === input.optionId);
  if (!option) return { ok: false, reason: "option_not_found" };
  const listing = await repos.capacity.getById(ctx, option.capacityListingId);
  if (!listing || listing.status !== "active") return { ok: false, reason: "listing_unavailable" };

  const estimate = estimateOption(shipment, listing, await repos.emissions.listFactors());
  const candidate = {
    ...option,
    totalPricePence: estimate.totalPricePence,
    co2Kg: estimate.co2Kg,
    co2SavedKg: estimate.co2SavedKg,
    arrivalAt: estimate.arrivalAt,
    deadlineMarginHours: estimate.deadlineMarginHours,
    mode: listing.mode,
    failures: [],
  };
  const service = deps.booking ?? createBookingService(deps);
  return service.book(ctx, { shipment, option, candidate });
}

export type ApprovalDecisionResult =
  | { ok: true; status: "declined" }
  | { ok: true; status: "booked"; bookingId: Id }
  | { ok: false; reason: string };

/** Records the shipper's decision; only an approval books. Declining never touches capacity. */
export async function decideApproval(
  deps: BookingDeps & { booking?: BookingService },
  ctx: AccessContext,
  input: { approvalId: Id; decision: "approved" | "declined"; selectedOptionId?: Id },
): Promise<ApprovalDecisionResult> {
  const { repos } = deps;
  const approval = await repos.approvals.getById(ctx, input.approvalId);
  if (!approval) return { ok: false, reason: "approval_not_found" };

  if (input.decision === "declined") {
    const decided = await repos.approvals.decide(ctx, approval.id, { status: "declined", selectedOptionId: null });
    if (!decided) return { ok: false, reason: "approval_not_pending" };
    await repos.audit.record(ctx, { actorUserId: null, action: "approval.declined", entityType: "approval", entityId: approval.id });
    return { ok: true, status: "declined" };
  }

  const selectedOptionId = input.selectedOptionId ?? approval.recommendedOptionId;
  if (!selectedOptionId) return { ok: false, reason: "no_option_selected" };
  const decided = await repos.approvals.decide(ctx, approval.id, { status: "approved", selectedOptionId });
  if (!decided) return { ok: false, reason: "approval_not_pending" };
  await repos.audit.record(ctx, {
    actorUserId: null,
    action: "approval.approved",
    entityType: "approval",
    entityId: approval.id,
    details: { selectedOptionId },
  });

  const result = await bookSelectedOption(deps, ctx, { shipmentId: approval.shipmentId, optionId: selectedOptionId });
  return result.ok ? { ok: true, status: "booked", bookingId: result.bookingId } : result;
}
