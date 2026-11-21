import type { SignupRole } from "@/lib/auth/roles";
import type { ApprovalReason } from "@/lib/domain/approval";
import type { NewCapacityListing } from "@/lib/domain/capacity";
import type { NewShipment } from "@/lib/domain/shipment";

/**
 * Milestone 5 scripted demo dataset. Pure builders: every time is relative to the injected
 * `now` (the reset time), so the scenarios behave the same whenever the demo is reset.
 * Prices are tuned against DEFAULT_APPROVAL_POLICY (GBP 100 auto limit, GBP 20k value, 12 h margin).
 */

export type DemoAccountKey = "shipper" | "road" | "freight";

export type DemoAccountSpec = { role: SignupRole; accountName: string; email: string };

export const DEMO_ACCOUNTS: Record<DemoAccountKey, DemoAccountSpec> = {
  shipper: { role: "business-shipper", accountName: "Verdant Ceramics Ltd", email: "shipper@demo.autoship.test" },
  road: { role: "provider", accountName: "Northline Haulage", email: "road@demo.autoship.test" },
  freight: { role: "provider", accountName: "BlueArc Freight", email: "freight@demo.autoship.test" },
};

export type DemoListingKey =
  | "road-london-manchester"
  | "road-london-manchester-return"
  | "road-manchester-london"
  | "sea-southampton-rotterdam"
  | "air-london-edinburgh"
  | "sea-felixstowe-hamburg";

export type DemoListingSpec = {
  key: DemoListingKey;
  provider: Exclude<DemoAccountKey, "shipper">;
  input: NewCapacityListing;
};

export type DemoExpectation =
  | { status: "booked"; listingKey: DemoListingKey; reasons: [] }
  | { status: "awaiting_approval" | "no_match"; listingKey: DemoListingKey; reasons: ApprovalReason[] };

export type DemoScenarioSpec = {
  key: string;
  name: string;
  /** Which primary flow this scenario demonstrates. */
  flow: string;
  shipment: NewShipment;
  /** For approvals, `listingKey` is the recommended (first) option. */
  expected: DemoExpectation;
};

const at = (now: Date, hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString();

type RoadFields = Pick<
  NewCapacityListing,
  "origin" | "destination" | "basePricePence" | "pricePerKgPence" | "distanceKm" | "isReturnLeg" | "totalCapacityKg"
>;

const road = (now: Date, fields: RoadFields, depart: number, arrive: number): NewCapacityListing => ({
  mode: "road",
  departureAt: at(now, depart),
  arrivalAt: at(now, arrive),
  recurrence: "one_off",
  recurrenceRule: null,
  maxItemWeightKg: 500,
  maxDimensionsCm: { length: 240, width: 200, height: 200 },
  acceptsDangerousGoods: false,
  acceptsFragile: true,
  status: "active",
  ...fields,
});

export function buildDemoListings(now: Date): DemoListingSpec[] {
  return [
    {
      key: "road-london-manchester",
      provider: "road",
      input: road(now, { origin: "London", destination: "Manchester", basePricePence: 3_000, pricePerKgPence: 50, distanceKm: 335, isReturnLeg: false, totalCapacityKg: 2_000 }, 24, 32),
    },
    {
      key: "road-london-manchester-return",
      provider: "road",
      input: road(now, { origin: "London", destination: "Manchester", basePricePence: 2_000, pricePerKgPence: 30, distanceKm: 335, isReturnLeg: true, totalCapacityKg: 800 }, 30, 40),
    },
    {
      key: "road-manchester-london",
      provider: "road",
      input: road(now, { origin: "Manchester", destination: "London", basePricePence: 2_500, pricePerKgPence: 40, distanceKm: 335, isReturnLeg: false, totalCapacityKg: 1_500 }, 48, 56),
    },
    {
      key: "sea-southampton-rotterdam",
      provider: "freight",
      input: {
        mode: "sea",
        origin: "Southampton",
        destination: "Rotterdam",
        departureAt: at(now, 72),
        arrivalAt: at(now, 120),
        recurrence: "recurring",
        recurrenceRule: "FREQ=WEEKLY",
        totalCapacityKg: 20_000,
        maxItemWeightKg: 5_000,
        maxDimensionsCm: { length: 600, width: 240, height: 260 },
        basePricePence: 6_000,
        pricePerKgPence: 20,
        distanceKm: 480,
        acceptsDangerousGoods: true,
        acceptsFragile: true,
        isReturnLeg: false,
        status: "active",
      },
    },
    {
      key: "air-london-edinburgh",
      provider: "freight",
      input: {
        mode: "air",
        origin: "London",
        destination: "Edinburgh",
        departureAt: at(now, 20),
        arrivalAt: at(now, 22),
        recurrence: "recurring",
        recurrenceRule: "FREQ=DAILY",
        totalCapacityKg: 500,
        maxItemWeightKg: 100,
        maxDimensionsCm: { length: 120, width: 80, height: 80 },
        basePricePence: 15_000,
        pricePerKgPence: 400,
        distanceKm: 535,
        acceptsDangerousGoods: false,
        acceptsFragile: true,
        isReturnLeg: false,
        status: "active",
      },
    },
    {
      key: "sea-felixstowe-hamburg",
      provider: "freight",
      input: {
        mode: "sea",
        origin: "Felixstowe",
        destination: "Hamburg",
        departureAt: at(now, 96),
        arrivalAt: at(now, 168),
        recurrence: "one_off",
        recurrenceRule: null,
        totalCapacityKg: 15_000,
        maxItemWeightKg: 4_000,
        maxDimensionsCm: { length: 600, width: 240, height: 260 },
        basePricePence: 5_000,
        pricePerKgPence: 15,
        distanceKm: 720,
        acceptsDangerousGoods: false,
        acceptsFragile: true,
        isReturnLeg: false,
        status: "active",
      },
    },
  ];
}

type ShipmentFields = Omit<NewShipment, "readyAt" | "deadlineAt" | "dangerousGoods">;

const shipment = (now: Date, fields: ShipmentFields, ready: number, deadline: number): NewShipment => ({
  ...fields,
  dangerousGoods: false,
  readyAt: at(now, ready),
  deadlineAt: at(now, deadline),
});

export function buildDemoScenarios(now: Date): DemoScenarioSpec[] {
  return [
    {
      key: "auto-cheapest-return-leg",
      name: "Tableware to the Manchester showroom",
      flow: "Automatic booking (cheapest: fills an empty return leg)",
      // Return leg: 20 + 50 kg x 0.30 = GBP 35, 32 h spare.
      shipment: shipment(now, { description: "Boxed tableware samples", modePreference: "road", dimensionsCm: { length: 80, width: 60, height: 60 }, weightKg: 50, declaredValuePence: 200_000, fragile: true, pickupLocation: "London", destinationLocation: "Manchester", budgetPence: 8_000, urgency: "standard", optimisation: "cheapest" }, 12, 72),
      expected: { status: "booked", listingKey: "road-london-manchester-return", reasons: [] },
    },
    {
      key: "auto-balanced-road",
      name: "Returned stock to the London warehouse",
      flow: "Automatic booking (balanced)",
      // 25 + 80 kg x 0.40 = GBP 57, 40 h spare.
      shipment: shipment(now, { description: "Returned glazed planters", modePreference: "any", dimensionsCm: { length: 120, width: 80, height: 90 }, weightKg: 80, declaredValuePence: 150_000, fragile: true, pickupLocation: "Manchester", destinationLocation: "London", budgetPence: 9_000, urgency: "standard", optimisation: "balanced" }, 24, 96),
      expected: { status: "booked", listingKey: "road-manchester-london", reasons: [] },
    },
    {
      key: "auto-fastest-road",
      name: "Trade-show display to Manchester",
      flow: "Automatic booking (fastest)",
      // Direct run: 30 + 30 kg x 0.50 = GBP 45, 40 h spare.
      shipment: shipment(now, { description: "Trade-show display kit", modePreference: "road", dimensionsCm: { length: 100, width: 60, height: 50 }, weightKg: 30, declaredValuePence: 120_000, fragile: false, pickupLocation: "London", destinationLocation: "Manchester", budgetPence: 6_000, urgency: "urgent", optimisation: "fastest" }, 12, 72),
      expected: { status: "booked", listingKey: "road-london-manchester", reasons: [] },
    },
    {
      key: "approval-price",
      name: "Pallet export to Rotterdam",
      flow: "Price approval (best option is over the GBP 100 automatic limit)",
      // 60 + 400 kg x 0.20 = GBP 140, 48 h spare, value GBP 8,000.
      shipment: shipment(now, { description: "Pallet of stoneware for a Dutch retailer", modePreference: "sea", dimensionsCm: { length: 120, width: 100, height: 150 }, weightKg: 400, declaredValuePence: 800_000, fragile: true, pickupLocation: "Southampton", destinationLocation: "Rotterdam", budgetPence: 20_000, urgency: "standard", optimisation: "lowest_carbon" }, 48, 168),
      expected: { status: "awaiting_approval", listingKey: "sea-southampton-rotterdam", reasons: ["price_over_limit"] },
    },
    {
      key: "critical-no-match",
      name: "Critical replacement part to Edinburgh",
      flow: "Critical shipment with no exact match (closest alternative misses the deadline)",
      // The only flight lands at +22 h, after the +18 h deadline: offered as a compromise.
      shipment: shipment(now, { description: "Replacement kiln controller", modePreference: "air", dimensionsCm: { length: 50, width: 40, height: 30 }, weightKg: 20, declaredValuePence: 500_000, fragile: true, pickupLocation: "London", destinationLocation: "Edinburgh", budgetPence: 30_000, urgency: "critical", optimisation: "fastest" }, 2, 18),
      expected: { status: "no_match", listingKey: "air-london-edinburgh", reasons: ["no_exact_match", "price_over_limit", "critical_shipment"] },
    },
  ];
}
