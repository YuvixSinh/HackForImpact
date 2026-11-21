/** UUID string. */
export type Id = string;

/** ISO-8601 timestamp with time zone, e.g. "2030-01-01T09:00:00.000Z". */
export type IsoDateTime = string;

/** Money is stored as integer pence (GBP) to avoid floating-point rounding. */
export type Pence = number;

export const TRANSPORT_MODES = ["road", "sea", "air"] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export type ModePreference = TransportMode | "any";

export type OptimisationPreference = "cheapest" | "fastest" | "lowest_carbon" | "balanced";

export type DimensionsCm = { length: number; width: number; height: number };

export type GeoPoint = { latitude: number; longitude: number };
