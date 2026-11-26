import { beforeEach, describe, expect, it } from "vitest";
import { runAutopilot } from "@/lib/autopilot/run";
import { bookSelectedOption, createBookingService, decideApproval } from "@/lib/bookings/service";
import { createInMemoryRepositories } from "@/lib/db/memory";
import type { Repositories } from "@/lib/db/repositories";
import type { AccessContext } from "@/lib/db/types";
import type { NewShipment } from "@/lib/domain/shipment";
import { createTestingPaymentAdapter } from "@/lib/payments/testing-adapter";
import type { PaymentAdapter } from "@/lib/payments/types";
import { listingInput, shipmentInput } from "../../fixtures/domain";
import { NOW } from "../../fixtures/matching";

describe("booking service", () => {
  let repos: Repositories;
  let payments: PaymentAdapter;
  let shipper: AccessContext;
  let provider: AccessContext;
  let listingId: string;

  const remaining = async (id = listingId) => (await repos.capacity.getById(provider, id))!.remainingCapacityKg;
  const deps = () => ({ repos, payments });

  async function autopilotShipment(overrides: Partial<NewShipment> = {}) {
    const s = await repos.shipments.create(shipper, shipmentInput(NOW, overrides));
    return runAutopilot({ repos, booking: createBookingService(deps()) }, shipper, s.id);
  }

  beforeEach(async () => {
    repos = createInMemoryRepositories({ clock: () => NOW });
    payments = createTestingPaymentAdapter();
    shipper = { accountId: (await repos.accounts.create({ kind: "shipper", shipperType: "business", name: "S", ownerUserId: "s" })).id };
    provider = { accountId: (await repos.accounts.create({ kind: "provider", shipperType: null, name: "P", ownerUserId: "p" })).id };
    listingId = (await repos.capacity.create(provider, listingInput(NOW))).id;
  });

  it("confirms a booking with payment and receipt references and decrements capacity once", async () => {
    const outcome = await autopilotShipment();
    if (outcome.status !== "booked") throw new Error(`expected booking, got ${outcome.status}`);
    const booking = await repos.bookings.getById(shipper, outcome.bookingId);
    expect(booking).toMatchObject({
      status: "confirmed",
      paymentStatus: "authorised",
      paymentReference: "pay_test_1",
      receiptReference: "rcpt_test_1",
    });
    expect(await remaining()).toBe(900);
  });

  it("rejects a repeat booking of the same shipment with capacity unchanged", async () => {
    const outcome = await autopilotShipment();
    if (outcome.status !== "booked") throw new Error("expected booking");
    const booking = (await repos.bookings.getById(shipper, outcome.bookingId))!;
    const [option] = await repos.matches.listForShipment(shipper, booking.shipmentId);
    const again = await bookSelectedOption(deps(), shipper, { shipmentId: booking.shipmentId, optionId: option.id });
    expect(again).toEqual({ ok: false, reason: "already_booked" });
    expect(await remaining()).toBe(900);
  });

  it("cannot oversell under concurrent bookings for different shipments", async () => {
    const tight = (await repos.capacity.create(provider, listingInput(NOW, { totalCapacityKg: 150, basePricePence: 100 }))).id;
    const deferred = { book: async () => ({ ok: false as const, reason: "deferred" }) };
    const prepare = async () => {
      const s = await repos.shipments.create(shipper, shipmentInput(NOW, { urgency: "critical" }));
      await runAutopilot({ repos, booking: deferred }, shipper, s.id);
      const option = (await repos.matches.listForShipment(shipper, s.id)).find((o) => o.capacityListingId === tight)!;
      return { shipmentId: s.id, optionId: option.id };
    };
    const [a, b] = [await prepare(), await prepare()];
    const results = await Promise.all([bookSelectedOption(deps(), shipper, a), bookSelectedOption(deps(), shipper, b)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ reason: expect.stringMatching(/insufficient_capacity|listing_unavailable/) });
    expect(await remaining(tight)).toBe(50);
  });

  it("releases the reservation and audits when payment fails", async () => {
    payments = createTestingPaymentAdapter({ spendingLimitPence: 100 });
    const outcome = await autopilotShipment();
    expect(outcome).toMatchObject({ status: "booking_failed", reason: expect.stringMatching(/^payment_failed: /) });
    const [booking] = await repos.bookings.listForAccount(shipper);
    expect(booking.status).toBe("released");
    expect(booking.paymentReference).toBeNull();
    expect(await remaining()).toBe(1000);
    const audit = await repos.audit.listForAccount(shipper);
    expect(audit.map((e) => e.action)).toContain("payment.failed");
  });

  it("books the chosen alternative when an approval is approved", async () => {
    const alt = (await repos.capacity.create(provider, listingInput(NOW, { basePricePence: 4_000 }))).id;
    const outcome = await autopilotShipment({ urgency: "critical" });
    if (outcome.status !== "awaiting_approval") throw new Error("expected approval");
    const approval = (await repos.approvals.getById(shipper, outcome.approvalId))!;
    const options = await repos.matches.listForShipment(shipper, approval.shipmentId);
    const altOption = options.find((o) => o.capacityListingId === alt)!;
    expect(altOption.id).not.toBe(approval.recommendedOptionId);
    const result = await decideApproval(deps(), shipper, { approvalId: approval.id, decision: "approved", selectedOptionId: altOption.id });
    expect(result.ok).toBe(true);
    const [booking] = await repos.bookings.listForAccount(shipper);
    expect(booking).toMatchObject({ capacityListingId: alt, status: "confirmed", matchOptionId: altOption.id });
    expect(await remaining(alt)).toBe(900);
    expect(await remaining()).toBe(1000);
  });

  it("declining leaves capacity unchanged and creates no booking", async () => {
    const outcome = await autopilotShipment({ urgency: "critical" });
    if (outcome.status !== "awaiting_approval") throw new Error("expected approval");
    const result = await decideApproval(deps(), shipper, { approvalId: outcome.approvalId, decision: "declined" });
    expect(result).toEqual({ ok: true, status: "declined" });
    expect(await repos.bookings.listForAccount(shipper)).toHaveLength(0);
    expect(await remaining()).toBe(1000);
    expect((await repos.approvals.getById(shipper, outcome.approvalId))?.status).toBe("declined");
  });

  it("refuses to book an approved option whose listing is no longer available", async () => {
    const outcome = await autopilotShipment({ urgency: "critical" });
    if (outcome.status !== "awaiting_approval") throw new Error("expected approval");
    await repos.capacity.update(provider, listingId, { status: "paused" });
    const approval = (await repos.approvals.getById(shipper, outcome.approvalId))!;
    const result = await decideApproval(deps(), shipper, {
      approvalId: approval.id,
      decision: "approved",
      selectedOptionId: approval.recommendedOptionId!,
    });
    expect(result).toEqual({ ok: false, reason: "listing_unavailable" });
    expect(await repos.bookings.listForAccount(shipper)).toHaveLength(0);
  });

  it("refuses a previously matched option after its listing no longer meets the shipment", async () => {
    const deferred = { book: async () => ({ ok: false as const, reason: "deferred" }) };
    const shipment = await repos.shipments.create(shipper, shipmentInput(NOW, { urgency: "critical" }));
    await runAutopilot({ repos, booking: deferred }, shipper, shipment.id);
    const [option] = await repos.matches.listForShipment(shipper, shipment.id);
    await repos.capacity.update(provider, listingId, { origin: "Bristol" });

    const result = await bookSelectedOption(deps(), shipper, { shipmentId: shipment.id, optionId: option.id });

    expect(result).toEqual({ ok: false, reason: "listing_ineligible:wrong_route" });
    expect(await repos.bookings.listForAccount(shipper)).toHaveLength(0);
    expect(await remaining()).toBe(1000);
  });

  it("refuses a stored quote when the provider changes the price before approval", async () => {
    const outcome = await autopilotShipment({ urgency: "critical" });
    if (outcome.status !== "awaiting_approval") throw new Error("expected approval");
    await repos.capacity.update(provider, listingId, { basePricePence: 30_000 });
    const approval = (await repos.approvals.getById(shipper, outcome.approvalId))!;

    const result = await decideApproval(deps(), shipper, {
      approvalId: approval.id,
      decision: "approved",
      selectedOptionId: approval.recommendedOptionId!,
    });

    expect(result).toEqual({ ok: false, reason: "option_changed" });
    expect((await repos.approvals.getById(shipper, approval.id))?.status).toBe("pending");
    expect(await repos.bookings.listForAccount(shipper)).toHaveLength(0);
    expect(await remaining()).toBe(1000);
  });
});
