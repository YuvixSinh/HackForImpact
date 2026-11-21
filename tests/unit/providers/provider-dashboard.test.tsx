import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProviderDashboard } from "@/components/dashboards/provider-dashboard";
import type { Account } from "@/lib/domain/account";
import type { Booking } from "@/lib/domain/booking";
import { listing } from "../../fixtures/matching";

const account = { id: "provider-1", name: "Haul Co", kind: "provider", shipperType: null } as Account;

const booking = {
  id: "abcd1234-0000-0000-0000-000000000000",
  providerAccountId: "provider-1",
  reservedWeightKg: 120,
  pricePence: 5_600,
  collectionAt: "2030-01-02T15:00:00.000Z",
  eta: "2030-01-03T01:00:00.000Z",
  status: "confirmed",
} as Booking;

describe("provider dashboard", () => {
  it("shows listings with remaining capacity, bookings, and the listing form", () => {
    const actions = { create: async () => undefined, update: async () => undefined, setStatus: async () => {} };
    render(
      <ProviderDashboard
        account={account}
        listings={[listing({ id: "l-1", remainingCapacityKg: 250 })]}
        bookings={[booking]}
        actions={actions}
      />,
    );
    expect(screen.getByText(/London → Manchester/)).toBeTruthy();
    expect(screen.getByRole("meter", { name: /remaining capacity/i }).getAttribute("aria-valuenow")).toBe("250");
    expect(screen.getByText("#ABCD1234")).toBeTruthy();
    expect(screen.getByText("£56.00")).toBeTruthy();
    expect(screen.getByRole("button", { name: /publish listing/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /pause/i })).toBeTruthy();
  });

  it("shows empty states", () => {
    render(<ProviderDashboard account={account} />);
    expect(screen.getByText(/no listings yet/i)).toBeTruthy();
    expect(screen.getByText(/no shipments booked/i)).toBeTruthy();
  });
});
