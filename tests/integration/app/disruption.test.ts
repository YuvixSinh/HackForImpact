import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingService } from "@/lib/autopilot/run";
import { createInMemoryRepositories } from "@/lib/db/memory";
import type { Repositories } from "@/lib/db/repositories";
import type { AccessContext } from "@/lib/db/types";
import { postStatus } from "@/lib/tracking/service";
import { listingInput, reservationPricing, shipmentInput } from "../../fixtures/domain";
import { NOW } from "../../fixtures/matching";

const HOUR = 3_600_000;
const at = (hours: number) => new Date(NOW.getTime() + hours * HOUR).toISOString();

describe("Disruption → re-match", () => {
  let repos: Repositories;
  let shipper: AccessContext;
  let provider: AccessContext;
  let other: AccessContext;
  let booking: BookingService & { book: ReturnType<typeof vi.fn> };
  let bookingId: string;
  let shipmentId: string;
  let originalListingId: string;

  beforeEach(async () => {
    repos = createInMemoryRepositories({ clock: () => NOW });
    const account = async (kind: "shipper" | "provider", name: string) =>
      ({ accountId: (await repos.accounts.create({ kind, shipperType: kind === "shipper" ? "business" : null, name, ownerUserId: name })).id });
    shipper = await account("shipper", "S");
    provider = await account("provider", "P");
    other = await account("provider", "Q");
    originalListingId = (await repos.capacity.create(provider, listingInput(NOW))).id;
    const s = await repos.shipments.create(shipper, shipmentInput(NOW));
    shipmentId = s.id;
    const reserved = await repos.bookings.reserve(shipper, { shipmentId, listingId: originalListingId, ...reservationPricing });
    if (!reserved.ok) throw new Error(reserved.reason);
    bookingId = reserved.booking.id;
    await repos.bookings.confirm(shipper, bookingId, { paymentReference: "p", receiptReference: "r" });
    // Fake booking service that reserves through the repository, as the real one does.
    booking = {
      book: vi.fn(async (ctx, { shipment, option }) => {
        const r = await repos.bookings.reserve(ctx, {
          shipmentId: shipment.id, listingId: option.capacityListingId, pricePence: option.totalPricePence, co2Kg: option.co2Kg, co2SavedKg: 0, matchOptionId: option.id,
        });
        return r.ok ? { ok: true as const, bookingId: r.booking.id } : { ok: false as const, reason: r.reason };
      }),
    };
  });

  it("rebooks a compliant replacement through Autopilot when the provider cancels", async () => {
    const replacement = await repos.capacity.create(other, listingInput(NOW, { departureAt: at(32), arrivalAt: at(44) }));

    const result = await postStatus({ repos, booking }, provider, { bookingId, status: "cancelled", message: "Vehicle broke down" });

    expect(result.rematch).toBe("rebooked");
    expect(booking.book).toHaveBeenCalledTimes(1);
    expect(booking.book.mock.calls[0][1].option.capacityListingId).toBe(replacement.id);
    expect((await repos.bookings.getById(shipper, bookingId))?.status).toBe("cancelled");
    expect((await repos.capacity.listOwn(provider))[0].remainingCapacityKg).toBe(1000);
    if (result.rematch !== "rebooked") throw new Error("expected rebooked");
    const newBooking = await repos.bookings.getById(shipper, result.bookingId);
    expect(newBooking?.capacityListingId).toBe(replacement.id);
    const actions = (await repos.audit.listForAccount(shipper)).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["tracking.cancelled", "autopilot.rebooked"]));
  });

  it("creates an approval card, without booking, when only a non-compliant alternative exists after a deadline-threatening delay", async () => {
    // Alternative arrives after the deadline (+96 h): not an exact match.
    await repos.capacity.create(other, listingInput(NOW, { departureAt: at(90), arrivalAt: at(120) }));

    const result = await postStatus({ repos, booking }, provider, { bookingId, status: "delayed", eta: at(110) });

    expect(result.rematch).toBe("approval_required");
    expect(booking.book).not.toHaveBeenCalled();
    expect((await repos.bookings.getById(shipper, bookingId))?.status).toBe("cancelled");
    const approvals = await repos.approvals.listForShipment(shipper, shipmentId);
    expect(approvals).toHaveLength(1);
    if (result.rematch !== "approval_required") throw new Error("expected approval");
    expect(result.approvalId).toBe(approvals[0].id);
    const actions = (await repos.audit.listForAccount(shipper)).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["tracking.delayed", "autopilot.rebook_needs_approval"]));
  });

  it("asks for approval when the only replacement is over the price limit", async () => {
    await repos.capacity.create(other, listingInput(NOW, { departureAt: at(32), arrivalAt: at(44) }));
    await repos.policies.save(shipper, { maxAutoPricePence: 1_000 });

    const result = await postStatus({ repos, booking }, provider, { bookingId, status: "cancelled" });

    expect(result.rematch).toBe("approval_required");
    expect(booking.book).not.toHaveBeenCalled();
  });
});
