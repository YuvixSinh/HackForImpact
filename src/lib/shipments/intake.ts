import { runAutopilot, type AutopilotOutcome, type BookingService } from "@/lib/autopilot/run";
import type { Repositories } from "@/lib/db/repositories";
import type { AccessContext } from "@/lib/db/types";
import type { Id } from "@/lib/domain/common";
import { parseShipmentForm, type ShipmentErrors, type ShipmentForm } from "./validation";

export type SubmitIntent = "ship_it" | "compare";

export type SubmitResult =
  | { ok: true; shipmentId: Id; autopilot: AutopilotOutcome | null }
  | { ok: false; errors: ShipmentErrors };

/**
 * Server-side intake: validate → store as `pending_match` → on "Ship it", run Autopilot.
 * "compare" stores the shipment for manual comparison without booking anything.
 */
export async function submitShipment(
  deps: { repos: Repositories; booking: BookingService; now: Date },
  ctx: AccessContext,
  form: ShipmentForm,
  intent: SubmitIntent,
): Promise<SubmitResult> {
  const parsed = parseShipmentForm(form, deps.now);
  if (!parsed.ok) return parsed;
  const shipment = await deps.repos.shipments.create(ctx, parsed.shipment);
  await deps.repos.audit.record(ctx, {
    actorUserId: null,
    action: "shipment.created",
    entityType: "shipment",
    entityId: shipment.id,
    details: { intent, route: `${shipment.pickupLocation} → ${shipment.destinationLocation}` },
  });
  const autopilot = intent === "ship_it" ? await runAutopilot(deps, ctx, shipment.id) : null;
  return { ok: true, shipmentId: shipment.id, autopilot };
}
