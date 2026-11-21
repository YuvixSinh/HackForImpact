import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAutopilot, type BookingService } from "@/lib/autopilot/run";
import { createInMemoryRepositories } from "@/lib/db/memory";
import type { Repositories } from "@/lib/db/repositories";
import type { AccessContext } from "@/lib/db/types";
import { listingInput, shipmentInput } from "../../fixtures/domain";
import { NOW } from "../../fixtures/matching";

describe("Autopilot decision step", () => {
  let repos: Repositories;
  let shipper: AccessContext;
  let provider: AccessContext;
  let booking: BookingService & { book: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    repos = createInMemoryRepositories({ clock: () => NOW });
    shipper = { accountId: (await repos.accounts.create({ kind: "shipper", shipperType: "business", name: "S", ownerUserId: "s" })).id };
    provider = { accountId: (await repos.accounts.create({ kind: "provider", shipperType: null, name: "P", ownerUserId: "p" })).id };
    await repos.capacity.create(provider, listingInput(NOW));
    booking = { book: vi.fn(async () => ({ ok: true as const, bookingId: "booking-1" })) };
  });

  it("books the top option when no rule applies", async () => {
    const s = await repos.shipments.create(shipper, shipmentInput(NOW));
    const outcome = await runAutopilot({ repos, booking }, shipper, s.id);
    expect(outcome.status).toBe("booked");
    expect(booking.book).toHaveBeenCalledTimes(1);
    expect(await repos.matches.listForShipment(shipper, s.id)).toHaveLength(1);
  });

  it.each([
    ["critical_shipment", { urgency: "critical" as const }],
    ["dangerous_goods", { dangerousGoods: true }],
    ["value_over_threshold", { declaredValuePence: 5_000_000 }],
  ])("creates an approval and never calls booking when %s applies", async (reason, overrides) => {
    if (reason === "dangerous_goods") {
      await repos.capacity.create(provider, listingInput(NOW, { acceptsDangerousGoods: true }));
    }
    const s = await repos.shipments.create(shipper, shipmentInput(NOW, overrides));
    const outcome = await runAutopilot({ repos, booking }, shipper, s.id);
    expect(outcome.status).toBe("awaiting_approval");
    expect(booking.book).not.toHaveBeenCalled();
    const [approval] = await repos.approvals.listForShipment(shipper, s.id);
    expect(approval.reasons).toContain(reason);
    expect((await repos.shipments.getById(shipper, s.id))?.status).toBe("awaiting_approval");
  });

  it("honours the account's saved thresholds", async () => {
    await repos.policies.save(shipper, { maxAutoPricePence: 1_000 });
    const s = await repos.shipments.create(shipper, shipmentInput(NOW));
    const outcome = await runAutopilot({ repos, booking }, shipper, s.id);
    expect(outcome).toMatchObject({ status: "awaiting_approval", reasons: ["price_over_limit"] });
    expect(booking.book).not.toHaveBeenCalled();
  });

  it("records no_match with closest alternatives and an approval card, without booking", async () => {
    const s = await repos.shipments.create(shipper, shipmentInput(NOW, { modePreference: "air" }));
    const outcome = await runAutopilot({ repos, booking }, shipper, s.id);
    expect(outcome).toMatchObject({ status: "no_match", reasons: ["no_exact_match"] });
    expect(booking.book).not.toHaveBeenCalled();
    expect((await repos.shipments.getById(shipper, s.id))?.status).toBe("no_match");
    const options = await repos.matches.listForShipment(shipper, s.id);
    expect(options[0]).toMatchObject({ isExactMatch: false, compromises: ["Uses road instead of air"] });
    expect(await repos.approvals.listForShipment(shipper, s.id)).toHaveLength(1);
  });

  it("refuses to run for another account's shipment", async () => {
    const s = await repos.shipments.create(shipper, shipmentInput(NOW));
    await expect(runAutopilot({ repos, booking }, provider, s.id)).rejects.toThrow(/not found/i);
    expect(booking.book).not.toHaveBeenCalled();
  });
});
