import type { Id, IsoDateTime, Pence } from "./common";

/** A scored candidate produced by the matching engine (Milestone 2). */
export type NewMatchOption = {
  capacityListingId: Id;
  totalPricePence: Pence;
  arrivalAt: IsoDateTime;
  deadlineMarginHours: number;
  co2Kg: number;
  score: number;
  /** 1 is best. */
  rank: number;
  /** False for "closest alternative" options shown when nothing meets every requirement. */
  isExactMatch: boolean;
  /** Plain-language differences from the request, e.g. "Arrives 6 hours after the deadline". */
  compromises: string[];
};

export type MatchOption = NewMatchOption & {
  id: Id;
  accountId: Id;
  shipmentId: Id;
  createdAt: IsoDateTime;
};
