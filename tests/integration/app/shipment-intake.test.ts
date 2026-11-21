import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingService } from "@/lib/autopilot/run";
import { createInMemoryRepositories } from "@/lib/db/memory";
import type { Repositories } from "@/lib/db/repositories";
import type { AccessContext } from "@/lib/db/types";
import { submitShipment } from "@/lib/shipments/intake";
import { listingInput } from "../../fixtures/domain";

const NOW = new Date("2030-01-01T09:00:00.000Z");
const form = {
  description: "Boxed ceramics",
  modePreference: "road",
  length: "120",
  width: "100",
  height: "90",
  weightKg: "100",
  declaredValue: "1500",
  fragile: "",
  dangerousGoods: "",
  pickupLocation: "London",
  destinationLocation: "Manchester",
  readyAt: "2030-01-02T09:00",
  deadlineAt: "2030-01-05T09:00",
  budget: "200",
  urgency: "standard",
  optimisation: "cheapest",
};

describe("shipment intake and Ship it", () => {
  let repos: Repositories;
  let shipper: AccessContext;
  let provider: AccessContext;
  let booking: BookingService & { book: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    repos = createInMemoryRepositories({ clock: () => NOW });
    shipper = { accountId: (await repos.accounts.create({ kind: "shipper", shipperType: "business", name: "S", ownerUserId: "s" })).id };
    provider = { accountId: (await repos.accounts.create({ kind: "provider", shipperType: null, name: "P", ownerUserId: "p" })).id };
    await repos.capacity.create(provider, listingInput(NOW));
    booking = { book: vi.fn(async () => ({ ok: true as const, bookingId: "b-1" })) };
  });

  it("stores a valid shipment as pending_match without running Autopilot when comparing manually", async () => {
    const result = await submitShipment({ repos, booking, now: NOW }, shipper, form, "compare");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((await repos.shipments.getById(shipper, result.shipmentId))?.status).toBe("pending_match");
    expect(result.autopilot).toBeNull();
    expect(booking.book).not.toHaveBeenCalled();
  });

  it("runs Autopilot on Ship it and books an unflagged option", async () => {
    const result = await submitShipment({ repos, booking, now: NOW }, shipper, form, "ship_it");
    expect(result.ok && result.autopilot?.status).toBe("booked");
    expect(booking.book).toHaveBeenCalledTimes(1);
  });

  it("returns field errors and stores nothing for invalid input", async () => {
    const result = await submitShipment({ repos, booking, now: NOW }, shipper, { ...form, weightKg: "0" }, "ship_it");
    expect(result).toMatchObject({ ok: false, errors: { weightKg: expect.any(String) } });
    expect(await repos.shipments.listForAccount(shipper)).toEqual([]);
    expect(booking.book).not.toHaveBeenCalled();
  });

  it("refuses providers", async () => {
    await expect(submitShipment({ repos, booking, now: NOW }, provider, form, "ship_it")).rejects.toThrow(/shipper/);
  });
});
