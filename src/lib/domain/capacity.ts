import type { DimensionsCm, Id, IsoDateTime, Pence, TransportMode } from "./common";

export type ListingStatus = "active" | "paused" | "archived";

export type Recurrence = "one_off" | "recurring";

/** Provider-entered fields for a one-off or recurring service. */
export type NewCapacityListing = {
  mode: TransportMode;
  origin: string;
  destination: string;
  departureAt: IsoDateTime;
  arrivalAt: IsoDateTime;
  recurrence: Recurrence;
  /** iCalendar RRULE text for recurring services, e.g. "FREQ=WEEKLY". */
  recurrenceRule: string | null;
  totalCapacityKg: number;
  maxItemWeightKg: number;
  maxDimensionsCm: DimensionsCm;
  basePricePence: Pence;
  pricePerKgPence: Pence;
  /** Fixed route distance used for CO₂ estimates until real routing exists. */
  distanceKm: number;
  acceptsDangerousGoods: boolean;
  acceptsFragile: boolean;
  /** Capacity on an otherwise empty return leg. */
  isReturnLeg: boolean;
  status: ListingStatus;
};

export type CapacityListing = NewCapacityListing & {
  id: Id;
  providerAccountId: Id;
  /** Reduced only by atomic reservation; never edited directly by matching. */
  remainingCapacityKg: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/** Fields a provider may edit after publishing. Capacity totals change through the repository only. */
export type CapacityListingPatch = Partial<Omit<NewCapacityListing, "totalCapacityKg">>;
