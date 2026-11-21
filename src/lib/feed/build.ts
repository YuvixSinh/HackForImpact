import type { ApprovalReason } from "@/lib/domain/approval";
import type { AuditEvent } from "@/lib/domain/audit";
import type { TrackingEvent } from "@/lib/domain/tracking";
import { REASON_LABELS } from "@/lib/policy/evaluate";

export type FeedTone = "info" | "success" | "warning" | "danger";
export type FeedItem = {
  id: string;
  kind: "shipment" | "approval" | "booking" | "payment" | "tracking" | "autopilot";
  tone: FeedTone;
  title: string;
  body: string;
  at: string;
  shipmentId: string | null;
};

type Copy = { kind: FeedItem["kind"]; tone: FeedTone; title: string; body?: (e: AuditEvent) => string };

const reasons = (e: AuditEvent) =>
  ((e.details.reasons as ApprovalReason[] | undefined) ?? []).map((r) => REASON_LABELS[r] ?? r).join("; ");

/** Shipper-facing copy per audit action; unknown/internal actions are left out of the feed. */
const AUDIT_COPY: Record<string, Copy> = {
  "shipment.created": { kind: "shipment", tone: "info", title: "Shipment created", body: (e) => String(e.details.route ?? "") },
  "autopilot.approval_requested": { kind: "approval", tone: "warning", title: "Approval needed", body: reasons },
  "autopilot.booked": { kind: "autopilot", tone: "success", title: "Autopilot booked your shipment" },
  "autopilot.booking_failed": { kind: "autopilot", tone: "danger", title: "Autopilot could not complete the booking" },
  "autopilot.rebooked": { kind: "autopilot", tone: "success", title: "Rebooked after a disruption" },
  "autopilot.rebook_needs_approval": { kind: "approval", tone: "warning", title: "Disruption: approval needed to rebook", body: reasons },
  "booking.confirmed": { kind: "booking", tone: "success", title: "Booking confirmed", body: () => "Payment authorised and receipt issued." },
  "booking.released": { kind: "booking", tone: "info", title: "Reservation released", body: () => "Capacity was returned; nothing was charged." },
  "booking.cancelled": { kind: "booking", tone: "danger", title: "Booking cancelled" },
  "payment.failed": { kind: "payment", tone: "danger", title: "Payment was not authorised", body: (e) => String(e.details.reason ?? "") },
  "approval.approved": { kind: "approval", tone: "success", title: "Approval given" },
  "approval.declined": { kind: "approval", tone: "info", title: "Approval declined", body: () => "Nothing was booked." },
};

const TRACKING_TONE: Record<TrackingEvent["status"], FeedTone> = {
  booked: "info",
  collected: "info",
  in_transit: "info",
  delayed: "warning",
  delivered: "success",
  cancelled: "danger",
};

export function buildFeed(auditEvents: readonly AuditEvent[], trackingEvents: readonly TrackingEvent[]): FeedItem[] {
  const fromAudit = auditEvents.flatMap((e): FeedItem[] => {
    const copy = AUDIT_COPY[e.action];
    if (!copy) return [];
    const shipmentId = e.entityType === "shipment" ? e.entityId : ((e.details.shipmentId as string | undefined) ?? null);
    return [{ id: e.id, kind: copy.kind, tone: copy.tone, title: copy.title, body: copy.body?.(e) ?? "", at: e.createdAt, shipmentId }];
  });
  const fromTracking = trackingEvents.map(
    (e): FeedItem => ({
      id: e.id,
      kind: "tracking",
      tone: TRACKING_TONE[e.status],
      title: `Shipment ${e.status.replace("_", " ")}`,
      body: e.message,
      at: e.occurredAt,
      shipmentId: null,
    }),
  );
  return [...fromAudit, ...fromTracking].sort((a, b) => b.at.localeCompare(a.at));
}
