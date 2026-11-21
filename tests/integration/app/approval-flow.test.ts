import { beforeEach, describe, expect, it } from "vitest";
import { bookOptionManually } from "@/app/shipper/shipments/manual-booking";
import { loadShipmentView } from "@/app/shipper/shipments/load-shipment-view";
import { runAutopilot } from "@/lib/autopilot/run";
import { createBookingService, decideApproval } from "@/lib/bookings/service";
import { createInMemoryRepositories } from "@/lib/db/memory";
import type { Repositories } from "@/lib/db/repositories";
import type { AccessContext } from "@/lib/db/types";
import { createTestingPaymentAdapter } from "@/lib/payments/testing-adapter";
import { listingInput, shipmentInput } from "../../fixtures/domain";

/** Approval flows 2–4 through the real repositories, policy, and booking service (testing payments). */
describe("approval flow", () => {
  let repos: Repositories;
  let deps: Parameters<typeof decideApproval>[0];
  let shipper: AccessContext;
  let provider: AccessContext;
  const now = new Date();

  beforeEach(async () => {
    repos = createInMemoryRepositories();
    const payments = createTestingPaymentAdapter();
    deps = { repos, payments, booking: createBookingService({ repos, payments }) };
    const account = async (kind: "shipper" | "provider", name: string) => ({
      accountId: (
        await repos.accounts.create({ kind, shipperType: kind === "shipper" ? "business" : null, name, ownerUserId: name })
      ).id,
    });
    shipper = await account("shipper", "s");
    provider = await account("provider", "p");
  });

  /** A critical shipment (always needs approval) with two road listings at different prices. */
  async function awaitingApproval() {
    const cheap = await repos.capacity.create(provider, listingInput(now, { basePricePence: 1_000 }));
    const dear = await repos.capacity.create(provider, listingInput(now, { basePricePence: 4_000 }));
    const shipment = await repos.shipments.create(shipper, shipmentInput(now, { urgency: "critical", optimisation: "cheapest" }));
    const outcome = await runAutopilot(deps as Required<typeof deps>, shipper, shipment.id);
    if (outcome.status !== "awaiting_approval") throw new Error(`unexpected ${outcome.status}`);
    const options = await repos.matches.listForShipment(shipper, shipment.id);
    const alternative = options.find((o) => o.capacityListingId === dear.id)!;
    return { shipment, approvalId: outcome.approvalId, cheap, dear, alternative };
  }

  it("shows the pending approval with its reasons on the shipment view", async () => {
    const { shipment, approvalId } = await awaitingApproval();
    const view = await loadShipmentView(repos, shipper, shipment.id);
    expect(view?.approval).toMatchObject({ id: approvalId, reasons: ["critical_shipment"] });
    expect(view?.options).toHaveLength(2);
    expect(view?.booking).toBeNull();
    expect(await loadShipmentView(repos, provider, shipment.id)).toBeNull();
  });

  it("approving an alternative books that alternative", async () => {
    const { shipment, approvalId, cheap, dear, alternative } = await awaitingApproval();
    const result = await decideApproval(deps, shipper, { approvalId, decision: "approved", selectedOptionId: alternative.id });
    expect(result).toMatchObject({ ok: true, status: "booked" });

    const [booking] = (await repos.bookings.listForAccount(shipper)).filter((b) => b.shipmentId === shipment.id);
    expect(booking.capacityListingId).toBe(dear.id);
    expect((await repos.capacity.getById(provider, dear.id))?.remainingCapacityKg).toBe(900);
    expect((await repos.capacity.getById(provider, cheap.id))?.remainingCapacityKg).toBe(1000);

    const view = await loadShipmentView(repos, shipper, shipment.id);
    expect(view?.approval).toBeNull();
    expect(view?.booking).toMatchObject({ pricePence: booking.pricePence, paymentStatus: "authorised" });
  });

  it("declining books nothing and leaves capacity unchanged", async () => {
    const { shipment, approvalId, cheap, dear } = await awaitingApproval();
    expect(await decideApproval(deps, shipper, { approvalId, decision: "declined" })).toEqual({ ok: true, status: "declined" });
    expect((await repos.bookings.listForAccount(shipper)).filter((b) => b.shipmentId === shipment.id)).toHaveLength(0);
    expect((await repos.capacity.getById(provider, cheap.id))?.remainingCapacityKg).toBe(1000);
    expect((await repos.capacity.getById(provider, dear.id))?.remainingCapacityKg).toBe(1000);
  });

  it("a manual choice that the policy flags becomes an approval instead of a booking", async () => {
    const listing = await repos.capacity.create(provider, listingInput(now));
    const shipment = await repos.shipments.create(shipper, shipmentInput(now, { urgency: "critical" }));
    const [option] = await repos.matches.replaceForShipment(shipper, shipment.id, [
      { capacityListingId: listing.id, totalPricePence: 5_000, arrivalAt: listing.arrivalAt, deadlineMarginHours: 56, co2Kg: 3, score: 1, rank: 1, isExactMatch: true, compromises: [] },
    ]);
    const result = await bookOptionManually(deps, shipper, { shipmentId: shipment.id, optionId: option.id });
    expect(result).toMatchObject({ ok: true, status: "approval_required", reasons: ["critical_shipment"] });
    expect((await repos.capacity.getById(provider, listing.id))?.remainingCapacityKg).toBe(1000);
    expect((await repos.shipments.getById(shipper, shipment.id))?.status).toBe("awaiting_approval");
  });

  it("a manual choice within policy books directly", async () => {
    const listing = await repos.capacity.create(provider, listingInput(now));
    const shipment = await repos.shipments.create(shipper, shipmentInput(now, { declaredValuePence: 10_000 }));
    const [option] = await repos.matches.replaceForShipment(shipper, shipment.id, [
      { capacityListingId: listing.id, totalPricePence: 5_000, arrivalAt: listing.arrivalAt, deadlineMarginHours: 56, co2Kg: 3, score: 1, rank: 1, isExactMatch: true, compromises: [] },
    ]);
    const result = await bookOptionManually(deps, shipper, { shipmentId: shipment.id, optionId: option.id });
    expect(result).toMatchObject({ ok: true, status: "booked" });
    expect((await repos.capacity.getById(provider, listing.id))?.remainingCapacityKg).toBe(900);
  });
});
