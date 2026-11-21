import { beforeEach, describe, expect, it } from "vitest";
import { runAutopilot } from "@/lib/autopilot/run";
import { createBookingService, decideApproval } from "@/lib/bookings/service";
import { createInMemoryRepositories } from "@/lib/db/memory";
import type { Repositories } from "@/lib/db/repositories";
import type { AccessContext } from "@/lib/db/types";
import { createTestingPaymentAdapter } from "@/lib/payments/testing-adapter";
import { listingInput, shipmentInput } from "../../fixtures/domain";

/** Failure paths found in the 2026-11-21 bug review. */
describe("booking failure paths", () => {
  const now = new Date();
  let repos: Repositories;
  let shipper: AccessContext;
  let provider: AccessContext;

  beforeEach(async () => {
    repos = createInMemoryRepositories();
    const account = async (kind: "shipper" | "provider", name: string) => ({
      accountId: (await repos.accounts.create({ kind, shipperType: kind === "shipper" ? "business" : null, name, ownerUserId: name })).id,
    });
    shipper = await account("shipper", "s");
    provider = await account("provider", "p");
  });

  async function pendingApproval(paymentsFail: boolean) {
    const listing = await repos.capacity.create(provider, listingInput(now, { basePricePence: 1_000 }));
    const payments = createTestingPaymentAdapter({ failWhen: () => paymentsFail });
    const deps = { repos, payments, booking: createBookingService({ repos, payments }) };
    const shipment = await repos.shipments.create(shipper, shipmentInput(now, { urgency: "critical" }));
    const outcome = await runAutopilot(deps, shipper, shipment.id);
    if (outcome.status !== "awaiting_approval") throw new Error(`unexpected ${outcome.status}`);
    return { deps, listing, shipment, approvalId: outcome.approvalId };
  }

  it("keeps the approval pending when the payment is declined after Approve, so the shipper can retry", async () => {
    const { deps, listing, shipment, approvalId } = await pendingApproval(true);
    const result = await decideApproval(deps, shipper, { approvalId, decision: "approved" });
    expect(result.ok).toBe(false);
    expect((await repos.approvals.getById(shipper, approvalId))?.status).toBe("pending");

    const [released] = (await repos.bookings.listForAccount(shipper)).filter((b) => b.shipmentId === shipment.id);
    expect(released.status).toBe("released");
    expect(released.paymentStatus).toBe("failed");
    expect((await repos.capacity.getById(provider, listing.id))?.remainingCapacityKg).toBe(listing.remainingCapacityKg);
  });

  it("rejects an option that was not offered in the approval instead of throwing", async () => {
    const { deps, approvalId } = await pendingApproval(false);
    await expect(decideApproval(deps, shipper, { approvalId, decision: "approved", selectedOptionId: "not-offered" })).resolves.toMatchObject({ ok: false });
    expect((await repos.approvals.getById(shipper, approvalId))?.status).toBe("pending");
  });

  it("releases the reserved capacity when confirming fails after payment", async () => {
    const listing = await repos.capacity.create(provider, listingInput(now, { basePricePence: 1_000 }));
    const payments = createTestingPaymentAdapter();
    const failingConfirm: Repositories = { ...repos, bookings: { ...repos.bookings, confirm: async () => ({ ok: false as const, reason: "not_reserved" as const }) } };
    const shipment = await repos.shipments.create(shipper, shipmentInput(now));
    const outcome = await runAutopilot({ repos: failingConfirm, booking: createBookingService({ repos: failingConfirm, payments }) }, shipper, shipment.id);
    expect(outcome.status).toBe("booking_failed");
    const [booking] = (await repos.bookings.listForAccount(shipper)).filter((b) => b.shipmentId === shipment.id);
    expect(booking.status).toBe("released");
    expect((await repos.capacity.getById(provider, listing.id))?.remainingCapacityKg).toBe(listing.remainingCapacityKg);
  });
});
