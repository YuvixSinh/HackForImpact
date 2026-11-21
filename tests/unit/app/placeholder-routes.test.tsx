import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import HomePage from "@/app/page";
import ProviderPage from "@/app/provider/page";
import ShipperPage from "@/app/shipper/page";

afterEach(cleanup);

describe("placeholder routes", () => {
  it("home links to both dashboards", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: /shipper/i }).getAttribute("href")).toBe("/shipper");
    expect(screen.getByRole("link", { name: /provider/i }).getAttribute("href")).toBe("/provider");
  });

  it("renders the shipper placeholder", () => {
    render(<ShipperPage />);
    expect(screen.getByRole("heading", { level: 1, name: /shipper dashboard/i })).toBeTruthy();
  });

  it("renders the provider placeholder", () => {
    render(<ProviderPage />);
    expect(screen.getByRole("heading", { level: 1, name: /provider dashboard/i })).toBeTruthy();
  });
});
