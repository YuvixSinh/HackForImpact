import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ApprovalCard } from "@/components/shipments/approval-card";
import { BookingCard } from "@/components/shipments/booking-card";
import { OptionsList } from "@/components/shipments/option-card";
import { RecommendationPanel } from "@/components/shipments/recommendation-panel";
import type { BookingView, OptionView } from "@/components/shipments/types";
import { REASON_LABELS } from "@/lib/policy/evaluate";

afterEach(cleanup);

const option = (overrides: Partial<OptionView> = {}): OptionView => ({
  id: "opt-1",
  rank: 1,
  mode: "road",
  departureAt: "2030-01-02T15:00:00.000Z",
  arrivalAt: "2030-01-03T01:00:00.000Z",
  totalPricePence: 5000,
  capacityFit: "100 kg of 1000 kg free",
  deadlineMarginHours: 56,
  co2Kg: 3.2,
  co2SavedKg: 280.5,
  isExactMatch: true,
  compromises: [],
  ...overrides,
});

const noop = async () => {};

describe("automatic booking", () => {
  const booking: BookingView = {
    reference: "BK-1234",
    mode: "road",
    route: "London → Manchester",
    pricePence: 5000,
    collectionAt: "2030-01-02T15:00:00.000Z",
    eta: "2030-01-03T01:00:00.000Z",
    co2Kg: 3.2,
    co2SavedKg: 280.5,
    receiptReference: "RCPT-9",
    paymentStatus: "authorised",
  };

  it("shows the booking details and sandbox payment wording without claiming escrow", () => {
    render(<BookingCard booking={booking} />);
    expect(screen.getByText("BK-1234")).toBeTruthy();
    expect(screen.getByText("£50.00")).toBeTruthy();
    expect(screen.getByText("RCPT-9")).toBeTruthy();
    expect(screen.getByText("Authorised")).toBeTruthy();
    expect(screen.getByText("280.5 kg")).toBeTruthy();
    expect(screen.getByText(/CO₂ saved vs dedicated vehicle/)).toBeTruthy();
    expect(screen.getByText(/Payment via SolvaPay \(sandbox\/testing\)/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/escrow/i);
  });
});

describe("approval required", () => {
  const options = [option(), option({ id: "opt-2", rank: 2, mode: "sea", totalPricePence: 3000 })];

  it("lists the reasons and offers approve, choose-alternative, and decline", () => {
    render(
      <ApprovalCard
        approval={{ id: "ap-1", reasons: ["price_over_limit", "critical_shipment"], recommendedOptionId: "opt-1" }}
        options={options}
        shipmentId="s-1"
        approveAction={noop}
        declineAction={noop}
      />,
    );
    const reasons = screen.getByRole("list", { name: "Approval reasons" });
    expect(within(reasons).getByText(REASON_LABELS.price_over_limit)).toBeTruthy();
    expect(within(reasons).getByText(REASON_LABELS.critical_shipment)).toBeTruthy();
    expect(screen.getByRole("button", { name: /approve recommended/i })).toBeTruthy();
    const alt = screen.getByRole("button", { name: /choose this alternative/i });
    expect(alt.textContent).toContain("£30.00");
    expect((alt.closest("form")!.querySelector('[name="selectedOptionId"]') as HTMLInputElement).value).toBe("opt-2");
    expect(screen.getByRole("button", { name: /decline/i })).toBeTruthy();
  });
});

describe("no exact match", () => {
  const alternatives = [
    option({ isExactMatch: false, deadlineMarginHours: -6, compromises: ["Arrives 6 hours after your deadline"] }),
    option({ id: "opt-2", rank: 2, isExactMatch: false, mode: "sea", compromises: ["Uses sea instead of road"] }),
  ];

  it("says the request is not fulfilled and shows closest alternatives with compromises", () => {
    render(
      <>
        <RecommendationPanel isExactMatch={false} explanation="No exact match. Closest alternative: …" recommended={alternatives[0]} />
        <OptionsList options={alternatives} recommendedId="opt-1" />
      </>,
    );
    expect(screen.getByRole("heading", { name: "No exact match" })).toBeTruthy();
    expect(screen.getByText(/not fulfilled/i)).toBeTruthy();
    const first = screen.getByRole("listitem", { name: "Option 1" });
    expect(within(first).getByText(/Arrives 6 hours after your deadline/)).toBeTruthy();
    expect(within(first).getByText("6 h late")).toBeTruthy();
    expect(within(screen.getByRole("listitem", { name: "Option 2" })).getByText(/Uses sea instead of road/)).toBeTruthy();
  });

  it("ranks options with their decisive fields and an optional manual book action", () => {
    render(<OptionsList options={[option()]} renderAction={(o) => <button>Book this option {o.id}</button>} />);
    const card = screen.getByRole("listitem", { name: "Option 1" });
    expect(within(card).getByText("£50.00")).toBeTruthy();
    expect(within(card).getByText("56 h to spare")).toBeTruthy();
    expect(within(card).getByText("100 kg of 1000 kg free")).toBeTruthy();
    expect(within(card).getByRole("button", { name: /book this option opt-1/i })).toBeTruthy();
  });
});
