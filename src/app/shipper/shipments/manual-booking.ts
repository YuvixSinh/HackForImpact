import { bookSelectedOption, type BookingDeps } from "@/lib/bookings/service";
import type { BookingService } from "@/lib/autopilot/run";
import type { AccessContext } from "@/lib/db/types";
import type { ApprovalReason } from "@/lib/domain/approval";
import type { Id } from "@/lib/domain/common";
import { estimateOption } from "@/lib/matching/estimate";
import type { MatchCandidate } from "@/lib/matching/match";
import { evaluatePolicy } from "@/lib/policy/evaluate";

export type ManualBookingResult =
  | { ok: true; status: "booked"; bookingId: Id }
  | { ok: true; status: "approval_required"; approvalId: Id; reasons: ApprovalReason[] }
  | { ok: false; reason: string };

/**
 * A shipper picks one ranked option by hand. It goes through the same approval policy as
 * Autopilot: if the choice is flagged, an approval request is created (or the pending one is
 * kept) instead of booking.
 */
export async function bookOptionManually(
  deps: BookingDeps & { booking?: BookingService },
  ctx: AccessContext,
  input: { shipmentId: Id; optionId: Id },
): Promise<ManualBookingResult> {
  const { repos } = deps;
  const shipment = await repos.shipments.getById(ctx, input.shipmentId);
  if (!shipment) return { ok: false, reason: "shipment_not_found" };
  const stored = await repos.matches.listForShipment(ctx, shipment.id);
  const option = stored.find((o) => o.id === input.optionId);
  if (!option) return { ok: false, reason: "option_not_found" };

  const pending = (await repos.approvals.listForShipment(ctx, shipment.id)).find((a) => a.status === "pending");
  if (pending) return { ok: true, status: "approval_required", approvalId: pending.id, reasons: pending.reasons };

  const listing = await repos.capacity.getById(ctx, option.capacityListingId);
  if (!listing || listing.status !== "active") return { ok: false, reason: "listing_unavailable" };
  const [factors, thresholds] = await Promise.all([repos.emissions.listFactors(), repos.policies.get(ctx)]);
  const candidate: MatchCandidate = {
    ...option,
    ...estimateOption(shipment, listing, factors),
    mode: listing.mode,
    failures: [],
  };
  const decision = evaluatePolicy({
    shipment,
    match: { isExactMatch: option.isExactMatch, options: [candidate], explanation: "" },
    thresholds,
  });

  if (decision.action === "needs_approval") {
    const approval = await repos.approvals.create(ctx, {
      shipmentId: shipment.id,
      reasons: decision.reasons,
      optionIds: stored.map((o) => o.id),
      recommendedOptionId: option.id,
    });
    await repos.shipments.updateStatus(ctx, shipment.id, option.isExactMatch ? "awaiting_approval" : "no_match");
    await repos.audit.record(ctx, {
      actorUserId: null,
      action: "manual.approval_requested",
      entityType: "approval",
      entityId: approval.id,
      details: { reasons: decision.reasons },
    });
    return { ok: true, status: "approval_required", approvalId: approval.id, reasons: decision.reasons };
  }

  const result = await bookSelectedOption(deps, ctx, { shipmentId: shipment.id, optionId: option.id });
  return result.ok ? { ok: true, status: "booked", bookingId: result.bookingId } : result;
}
