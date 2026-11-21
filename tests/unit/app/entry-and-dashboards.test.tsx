import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import HomePage from "@/app/page";
import { ProviderDashboard } from "@/components/dashboards/provider-dashboard";
import { ShipperDashboard } from "@/components/dashboards/shipper-dashboard";
import type { Account } from "@/lib/domain/account";

afterEach(cleanup);

const account = (overrides: Partial<Account>): Account => ({
  id: "a",
  kind: "shipper",
  shipperType: "business",
  name: "Acme Ceramics",
  createdAt: "2030-01-01T00:00:00.000Z",
  ...overrides,
});

describe("account entry", () => {
  it("offers a separate sign-up path for each account type, plus sign-in", () => {
    render(<HomePage />);
    const href = (name: RegExp) => screen.getByRole("link", { name }).getAttribute("href");
    expect(href(/business shipper/i)).toBe("/signup/business-shipper");
    expect(href(/individual shipper/i)).toBe("/signup/individual-shipper");
    expect(href(/transport provider/i)).toBe("/signup/provider");
    expect(href(/sign in/i)).toBe("/signin");
  });
});

describe("role-specific dashboards", () => {
  it("shows the shipper's account and shipper areas", () => {
    render(<ShipperDashboard account={account({ shipperType: "individual", name: "Sam Lee" })} />);
    expect(screen.getByRole("heading", { level: 1, name: /shipper dashboard/i })).toBeTruthy();
    expect(screen.getByText(/Sam Lee/)).toBeTruthy();
    expect(screen.getByText(/individual shipper/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /carbon meter/i })).toBeTruthy();
  });

  it("shows the provider's account and provider areas", () => {
    render(<ProviderDashboard account={account({ kind: "provider", shipperType: null, name: "Haul Co" })} />);
    expect(screen.getByRole("heading", { level: 1, name: /provider dashboard/i })).toBeTruthy();
    expect(screen.getByText(/Haul Co/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /capacity listings/i })).toBeTruthy();
  });
});
