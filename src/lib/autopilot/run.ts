import type { Repositories } from "@/lib/db/repositories";
import { AccessError, type AccessContext } from "@/lib/db/types";
import type { ApprovalReason } from "@/lib/domain/approval";
import type { Id } from "@/lib/domain/common";
import type { MatchOption, NewMatchOption } from "@/lib/domain/match";
import type { Shipment } from "@/lib/domain/shipment";
import { matchShipment, type MatchCandidate, type MatchResult } from "@/lib/matching/match";
import { evaluatePolicy } from "@/lib/policy/evaluate";

/** Books one chosen option: reservation + payment. Implemented in the booking task. */
export interface BookingService {
  book(
    ctx: AccessContext,
    input: { shipment: Shipment; option: MatchOption; candidate: MatchCandidate },
  ): Promise<{ ok: true; bookingId: Id } | { ok: false; reason: string }>;
}

export type AutopilotOutcome =
  | { status: "booked"; bookingId: Id; match: MatchResult; reasons: [] }
  | { status: "awaiting_approval" | "no_match"; approvalId: Id; match: MatchResult; reasons: ApprovalReason[] }
  | { status: "booking_failed"; reason: string; match: MatchResult; reasons: [] };

export type AutopilotOptions = {
  /** Listings to leave out of this run, e.g. the one a provider just cancelled (re-matching). */
  excludeListingIds?: readonly Id[];
};

/** Keeps only the persisted match-option fields (display-only details are recomputed on read). */
function toStoredOption(c: MatchCandidate): NewMatchOption {
  return {
    capacityListingId: c.capacityListingId,
    totalPricePence: c.totalPricePence,
    arrivalAt: c.arrivalAt,
    deadlineMarginHours: c.deadlineMarginHours,
    co2Kg: c.co2Kg,
    score: c.score,
    rank: c.rank,
    isExactMatch: c.isExactMatch,
    compromises: c.compromises,
  };
}

/**
 * One Autopilot run for a shipment: match → store options → policy → book or ask.
 * A flagged result creates an approval request and never touches the booking service.
 */
export async function runAutopilot(
  deps: { repos: Repositories; booking: BookingService },
  ctx: AccessContext,
  shipmentId: Id,
  options?: AutopilotOptions,
): Promise<AutopilotOutcome> {
  const { repos } = deps;
  const shipment = await repos.shipments.getById(ctx, shipmentId);
  if (!shipment) throw new AccessError("Shipment not found");

  const [available, factors, thresholds] = await Promise.all([
    repos.capacity.listAvailable(ctx),
    repos.emissions.listFactors(),
    repos.policies.get(ctx),
  ]);
  const excluded = new Set(options?.excludeListingIds ?? []);
  const listings = excluded.size ? available.filter((l) => !excluded.has(l.id)) : available;
  const match = matchShipment(shipment, listings, factors);
  const stored = await repos.matches.replaceForShipment(
    ctx,
    shipment.id,
    match.options.map(toStoredOption),
  );
  const decision = evaluatePolicy({ shipment, match, thresholds });

  if (decision.action === "auto_book") {
    const result = await deps.booking.book(ctx, { shipment, option: stored[0], candidate: decision.option });
    await repos.audit.record(ctx, {
      actorUserId: null,
      action: result.ok ? "autopilot.booked" : "autopilot.booking_failed",
      entityType: "shipment",
      entityId: shipment.id,
    });
    return result.ok
      ? { status: "booked", bookingId: result.bookingId, match, reasons: [] }
      : { status: "booking_failed", reason: result.reason, match, reasons: [] };
  }

  const approval = await repos.approvals.create(ctx, {
    shipmentId: shipment.id,
    reasons: decision.reasons,
    optionIds: stored.map((o) => o.id),
    recommendedOptionId: stored[0]?.id ?? null,
  });
  const status = match.isExactMatch ? "awaiting_approval" : "no_match";
  await repos.shipments.updateStatus(ctx, shipment.id, status);
  await repos.audit.record(ctx, {
    actorUserId: null,
    action: "autopilot.approval_requested",
    entityType: "approval",
    entityId: approval.id,
    details: { reasons: decision.reasons },
  });
  return { status, approvalId: approval.id, match, reasons: decision.reasons };
}
