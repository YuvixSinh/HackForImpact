import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryRepositories, type InMemoryRepositories } from "@/lib/db/memory";
import type { AccessContext } from "@/lib/db/types";
import { listingInput, reservationPricing, shipmentInput } from "../../fixtures/domain";

const NOW = new Date("2030-01-01T09:00:00.000Z");

describe("in-memory account isolation", () => {
  let repos: InMemoryRepositories;
  let a: AccessContext;
  let b: AccessContext;
  let provider: AccessContext;
  let otherProvider: AccessContext;

  beforeEach(async () => {
    repos = createInMemoryRepositories({ clock: () => NOW });
    const make = async (kind: "shipper" | "provider", name: string) => ({
      accountId: (
        await repos.accounts.create({ kind, shipperType: kind === "shipper" ? "business" : null, name, ownerUserId: name })
      ).id,
    });
    a = await make("shipper", "a");
    b = await make("shipper", "b");
    provider = await make("provider", "p");
    otherProvider = await make("provider", "q");
  });

  it("only returns an account to its own context", async () => {
    expect(await repos.accounts.getById(a, a.accountId)).not.toBeNull();
    expect(await repos.accounts.getById(b, a.accountId)).toBeNull();
  });

  it("hides one shipper's shipments from another", async () => {
    const shipment = await repos.shipments.create(a, shipmentInput(NOW));
    expect(await repos.shipments.getById(b, shipment.id)).toBeNull();
    expect(await repos.shipments.listForAccount(b)).toEqual([]);
    expect(await repos.shipments.updateStatus(b, shipment.id, "cancelled")).toBeNull();
    expect((await repos.shipments.getById(a, shipment.id))?.status).toBe("pending_match");
  });

  it("only lets shipper accounts create shipments and providers create listings", async () => {
    await expect(repos.shipments.create(provider, shipmentInput(NOW))).rejects.toThrow(/shipper/);
    await expect(repos.capacity.create(a, listingInput(NOW))).rejects.toThrow(/provider/);
  });

  it("shows a booking to its shipper and provider only", async () => {
    const shipment = await repos.shipments.create(a, shipmentInput(NOW));
    const listing = await repos.capacity.create(provider, listingInput(NOW));
    const result = await repos.bookings.reserve(a, { shipmentId: shipment.id, listingId: listing.id, ...reservationPricing });
    if (!result.ok) throw new Error(result.reason);
    const id = result.booking.id;
    expect(await repos.bookings.getById(a, id)).not.toBeNull();
    expect(await repos.bookings.getById(provider, id)).not.toBeNull();
    expect(await repos.bookings.getById(b, id)).toBeNull();
    expect(await repos.bookings.getById(otherProvider, id)).toBeNull();
    expect(await repos.bookings.listForAccount(b)).toEqual([]);
    expect(await repos.bookings.listForAccount(provider)).toHaveLength(1);
  });

  it("shares only active listings with remaining capacity across accounts", async () => {
    const active = await repos.capacity.create(provider, listingInput(NOW));
    const paused = await repos.capacity.create(provider, listingInput(NOW, { status: "paused" }));
    const visible = (await repos.capacity.listAvailable(a)).map((l) => l.id);
    expect(visible).toEqual([active.id]);
    expect(await repos.capacity.getById(a, paused.id)).toBeNull();
    expect(await repos.capacity.update(otherProvider, active.id, { basePricePence: 1 })).toBeNull();
    expect(await repos.capacity.listOwn(otherProvider)).toEqual([]);
  });

  it("keeps policies, matches, approvals, tracking, and audit per account", async () => {
    const shipment = await repos.shipments.create(a, shipmentInput(NOW));
    await repos.policies.save(a, { maxAutoPricePence: 5_000 });
    expect((await repos.policies.get(b)).maxAutoPricePence).toBe(10_000);
    expect(await repos.matches.listForShipment(b, shipment.id)).toEqual([]);
    await expect(repos.matches.replaceForShipment(b, shipment.id, [])).rejects.toThrow(/not found/);
    await expect(
      repos.approvals.create(b, { shipmentId: shipment.id, reasons: ["critical_shipment"], optionIds: [], recommendedOptionId: null }),
    ).rejects.toThrow(/not found/);
    await repos.audit.record(a, { actorUserId: "a", action: "test", entityType: "shipment", entityId: shipment.id });
    expect(await repos.audit.listForAccount(b)).toEqual([]);
  });

  it("limits tracking events to the booking's parties and lets only its provider post", async () => {
    const shipment = await repos.shipments.create(a, shipmentInput(NOW));
    const listing = await repos.capacity.create(provider, listingInput(NOW));
    const result = await repos.bookings.reserve(a, { shipmentId: shipment.id, listingId: listing.id, ...reservationPricing });
    if (!result.ok) throw new Error(result.reason);
    const event = { bookingId: result.booking.id, status: "collected" as const, message: "Collected", location: null, eta: null };
    await expect(repos.tracking.append(otherProvider, event)).rejects.toThrow(/not found/);
    await repos.tracking.append(provider, event);
    expect(await repos.tracking.listForBooking(a, result.booking.id)).toHaveLength(1);
    expect(await repos.tracking.listForBooking(b, result.booking.id)).toEqual([]);
  });
});
