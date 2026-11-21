import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryRepositories, type InMemoryRepositories } from "@/lib/db/memory";
import type { AccessContext } from "@/lib/db/types";
import { DEFAULT_APPROVAL_POLICY } from "@/lib/domain/policy";
import type { NewMatchOption } from "@/lib/domain/match";
import { listingInput, shipmentInput } from "../../fixtures/domain";

const NOW = new Date("2030-01-01T09:00:00.000Z");

describe("in-memory repositories support the primary flows", () => {
  let repos: InMemoryRepositories;
  let shipper: AccessContext;
  let provider: AccessContext;

  beforeEach(async () => {
    repos = createInMemoryRepositories({ clock: () => NOW });
    shipper = { accountId: (await repos.accounts.create({ kind: "shipper", shipperType: "individual", name: "S", ownerUserId: "s" })).id };
    provider = { accountId: (await repos.accounts.create({ kind: "provider", shipperType: null, name: "P", ownerUserId: "p" })).id };
  });

  async function shipmentWithOptions() {
    const shipment = await repos.shipments.create(shipper, shipmentInput(NOW));
    const listing = await repos.capacity.create(provider, listingInput(NOW));
    const option = (rank: number): NewMatchOption => ({
      capacityListingId: listing.id,
      totalPricePence: 4_000 + rank,
      arrivalAt: listing.arrivalAt,
      deadlineMarginHours: 56,
      co2Kg: 3,
      score: 1 / rank,
      rank,
      isExactMatch: true,
      compromises: [],
    });
    const options = await repos.matches.replaceForShipment(shipper, shipment.id, [option(1), option(2)]);
    return { shipment, listing, options };
  }

  it("creates shipments as pending_match and records no-match outcomes", async () => {
    const shipment = await repos.shipments.create(shipper, shipmentInput(NOW));
    expect(shipment.status).toBe("pending_match");
    expect(shipment.createdAt).toBe(NOW.toISOString());
    expect((await repos.shipments.updateStatus(shipper, shipment.id, "no_match"))?.status).toBe("no_match");
  });

  it("returns default approval thresholds and saves account overrides", async () => {
    expect(await repos.policies.get(shipper)).toEqual({ accountId: shipper.accountId, ...DEFAULT_APPROVAL_POLICY });
    const saved = await repos.policies.save(shipper, { minDeadlineMarginHours: 24 });
    expect(saved).toMatchObject({ maxAutoPricePence: 10_000, declaredValueThresholdPence: 2_000_000, minDeadlineMarginHours: 24 });
  });

  it("replaces ranked match options for a shipment", async () => {
    const { shipment, listing, options } = await shipmentWithOptions();
    expect(options.map((o) => o.rank)).toEqual([1, 2]);
    await repos.matches.replaceForShipment(shipper, shipment.id, [{ ...options[0], capacityListingId: listing.id, rank: 1 }]);
    expect(await repos.matches.listForShipment(shipper, shipment.id)).toHaveLength(1);
  });

  it("decides an approval once, with an alternative selection", async () => {
    const { shipment, options } = await shipmentWithOptions();
    const approval = await repos.approvals.create(shipper, {
      shipmentId: shipment.id,
      reasons: ["price_over_limit", "dangerous_goods"],
      optionIds: options.map((o) => o.id),
      recommendedOptionId: options[0].id,
    });
    expect(approval.status).toBe("pending");
    const decided = await repos.approvals.decide(shipper, approval.id, { status: "approved", selectedOptionId: options[1].id });
    expect(decided).toMatchObject({ status: "approved", selectedOptionId: options[1].id, decidedAt: NOW.toISOString() });
    expect(await repos.approvals.decide(shipper, approval.id, { status: "declined", selectedOptionId: null })).toBeNull();
  });

  it("rejects selecting an option that is not part of the approval", async () => {
    const { shipment, options } = await shipmentWithOptions();
    const approval = await repos.approvals.create(shipper, {
      shipmentId: shipment.id,
      reasons: ["no_exact_match"],
      optionIds: [options[0].id],
      recommendedOptionId: options[0].id,
    });
    await expect(
      repos.approvals.decide(shipper, approval.id, { status: "approved", selectedOptionId: options[1].id }),
    ).rejects.toThrow(/not offered/);
  });

  it("lets providers manage their listings", async () => {
    const listing = await repos.capacity.create(provider, listingInput(NOW, { recurrence: "recurring", recurrenceRule: "FREQ=WEEKLY" }));
    expect(listing.remainingCapacityKg).toBe(listing.totalCapacityKg);
    const updated = await repos.capacity.update(provider, listing.id, { status: "paused", basePricePence: 2_500 });
    expect(updated).toMatchObject({ status: "paused", basePricePence: 2_500 });
    expect(await repos.capacity.listOwn(provider)).toHaveLength(1);
  });

  it("provides emissions factors for every transport mode", async () => {
    const modes = (await repos.emissions.listFactors()).map((f) => f.mode).sort();
    expect(modes).toEqual(["air", "road", "sea"]);
  });
});
