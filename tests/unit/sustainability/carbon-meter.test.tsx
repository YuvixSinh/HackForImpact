import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CarbonMeter } from "@/components/shipper/carbon-meter";

describe("CarbonMeter", () => {
  it("labels month and year totals with baseline, saving, and score", () => {
    render(
      <CarbonMeter
        summary={{
          month: { co2Kg: 15, baselineKg: 60, savedKg: 45, bookings: 2, score: 75 },
          year: { co2Kg: 35, baselineKg: 100, savedKg: 65, bookings: 3, score: 65 },
          monthStart: "2030-06-01T00:00:00.000Z",
          yearStart: "2030-01-01T00:00:00.000Z",
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: /carbon meter/i })).toBeTruthy();
    expect(screen.getByText(/This month · June 2030/)).toBeTruthy();
    expect(screen.getByText(/This year · 2030/)).toBeTruthy();
    expect(screen.getByText("45 kg")).toBeTruthy();
    expect(screen.getByText("100 kg")).toBeTruthy();
    expect(screen.getByLabelText(/sustainability score 75/i)).toBeTruthy();
  });
});
