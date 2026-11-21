import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAutopilot, type BookingService } from "@/lib/autopilot/run";
import { createInMemoryRepositories } from "@/lib/db/memory";
import type { Repositories } from "@/lib/db/repositories";
import type { AccessContext } from "@/lib/db/types";
import { allowedNextStatuses, postStatus, TrackingTransitionError } from "@/lib/tracking/service";
import { listingInput, reservationPricing, shipmentInput } from "../../fixtures/domain";
import { NOW } from "../../fixtures/matching";

describe("allowedNextStatuses", () => {
  it("follows booked → collected → in_transit → delivered with delay/cancel side paths", () => {
    expect(allowedNextStatuses([])).toEqual(["collected", "delayed", "cancelled"]);
    expect(allowedNextStatuses(["collected"])).toEqual(["in_transit", "delayed", "cancelled"]);
    expect(allowedNextStatuses(["collected", "in_transit", "delayed"])).toEqual(["delivered", "delayed", "cancelled"]);
    expect(allowedNextStatuses(["collected", "in_transit", "delivered"])).toEqual([]);
    expect(allowedNextStatuses(["cancelled"])).toEqual([]);
  });
});

describe("postStatus", () => {
  let repos: Repositories;
  let shipper: AccessContext;
  let provider: AccessContext;
  let booking: BookingService & { book: ReturnType<typeof vi.fn> };
  let bookingId: string;
  let shipmentId: string;

  beforeEach(async () => {
    repos = createInMemoryRepositories({ clock: () => NOW });
    shipper = { accountId: (await repos.accounts.create({ kind: "shipper", shipperType: "business", name: "S", ownerUserId: "s" })).id };
    provider = { accountId: (await repos.accounts.create({ kind: "provider", shipperType: null, name: "P", ownerUserId: "p" })).id };
    const listing = await repos.capacity.create(provider, listingInput(NOW));
    const s = await repos.shipments.create(shipper, shipmentInput(NOW));
    shipmentId = s.id;
    const reserved = await repos.bookings.reserve(shipper, { shipmentId, listingId: listing.id, ...reservationPricing });
    if (!reserved.ok) throw new Error(reserved.reason);
    bookingId = reserved.booking.id;
    await repos.bookings.confirm(shipper, bookingId, { paymentReference: "p", receiptReference: "r" });
    booking = { book: vi.fn(async () => ({ ok: true as const, bookingId: "replacement" })) };
  });

  it("records a provider status and moves the shipment to in transit", async () => {
    await postStatus({ repos, booking }, provider, { bookingId, status: "collected" });
    const result = await postStatus({ repos, booking }, provider, { bookingId, status: "in_transit", message: "On the M6" });
    expect(result).toMatchObject({ rematch: "not_needed", event: { status: "in_transit", message: "On the M6" } });
    expect((await repos.shipments.getById(shipper, shipmentId))?.status).toBe("in_transit");
    const audit = await repos.audit.listForAccount(shipper);
    expect(audit.map((a) => a.action)).toContain("tracking.in_transit");
  });

  it("rejects a non-provider posting status", async () => {
    await expect(postStatus({ repos, booking }, shipper, { bookingId, status: "collected" })).rejects.toThrow(/not found/i);
    expect(await repos.tracking.listForBooking(shipper, bookingId)).toHaveLength(0);
  });

  it("rejects an invalid transition", async () => {
    await expect(postStatus({ repos, booking }, provider, { bookingId, status: "delivered" })).rejects.toBeInstanceOf(TrackingTransitionError);
    expect(await repos.tracking.listForBooking(provider, bookingId)).toHaveLength(0);
  });

  it("does not re-match a delay that still meets the deadline", async () => {
    const result = await postStatus({ repos, booking }, provider, {
      bookingId, status: "delayed", eta: new Date(NOW.getTime() + 50 * 3_600_000).toISOString(),
    });
    expect(result.rematch).toBe("not_needed");
    expect((await repos.bookings.getById(shipper, bookingId))?.status).toBe("confirmed");
    expect(booking.book).not.toHaveBeenCalled();
  });

  it("cancels a booking once and restores capacity once", async () => {
    const [listing] = await repos.capacity.listOwn(provider);
    expect(listing.remainingCapacityKg).toBe(900);
    expect((await repos.bookings.cancel(provider, bookingId)).ok).toBe(true);
    expect(await repos.bookings.cancel(shipper, bookingId)).toEqual({ ok: false, reason: "not_active" });
    expect((await repos.capacity.listOwn(provider))[0].remainingCapacityKg).toBe(1000);
  });

  it("runAutopilot honours excludeListingIds", async () => {
    const [listing] = await repos.capacity.listOwn(provider);
    await repos.bookings.cancel(provider, bookingId);
    const outcome = await runAutopilot({ repos, booking }, shipper, shipmentId, { excludeListingIds: [listing.id] });
    expect(outcome.status).toBe("no_match");
    expect(booking.book).not.toHaveBeenCalled();
  });
});
