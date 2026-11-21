import type { GeoPoint, Id, IsoDateTime } from "./common";

export type TrackingStatus = "booked" | "collected" | "in_transit" | "delayed" | "delivered" | "cancelled";

export type NewTrackingEvent = {
  bookingId: Id;
  status: TrackingStatus;
  message: string;
  /** Simulated position for the map; null when unknown. */
  location: GeoPoint | null;
  /** Revised ETA for delays. */
  eta: IsoDateTime | null;
};

export type TrackingEvent = NewTrackingEvent & {
  id: Id;
  shipperAccountId: Id;
  providerAccountId: Id;
  occurredAt: IsoDateTime;
};
