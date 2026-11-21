import { describe, expect, it } from "vitest";
import type { AuditEvent } from "@/lib/domain/audit";
import type { TrackingEvent } from "@/lib/domain/tracking";
import { buildFeed } from "@/lib/feed/build";

const audit = (action: string, createdAt: string, details: Record<string, unknown> = {}): AuditEvent => ({
  id: `${action}-${createdAt}`,
  accountId: "a",
  actorUserId: null,
  action,
  entityType: "shipment",
  entityId: "s-1",
  details,
  createdAt,
});

const tracking = (status: TrackingEvent["status"], occurredAt: string): TrackingEvent => ({
  id: `${status}-${occurredAt}`,
  bookingId: "b-1",
  shipperAccountId: "a",
  providerAccountId: "p",
  status,
  message: `Status: ${status}`,
  location: null,
  eta: null,
  occurredAt,
});

describe("shipment feed", () => {
  it("turns audit and tracking events into newest-first plain-language items", () => {
    const feed = buildFeed(
      [
        audit("shipment.created", "2030-01-01T09:00:00.000Z"),
        audit("autopilot.approval_requested", "2030-01-01T09:01:00.000Z", { reasons: ["price_over_limit"] }),
        audit("booking.confirmed", "2030-01-01T09:02:00.000Z"),
      ],
      [tracking("delayed", "2030-01-01T10:00:00.000Z")],
    );
    expect(feed.map((i) => i.kind)).toEqual(["tracking", "booking", "approval", "shipment"]);
    expect(feed[0]).toMatchObject({ tone: "warning", title: expect.stringMatching(/delayed/i) });
    expect(feed[2].body).toMatch(/automatic booking limit/i);
  });

  it("skips internal events that have no shipper-facing meaning", () => {
    expect(buildFeed([audit("booking.reserved", "2030-01-01T09:00:00.000Z")], [])).toEqual([]);
  });
});
