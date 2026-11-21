import type { TransportMode } from "./common";

/** Reference data shared by all accounts, used for CO₂ estimates and savings. */
export type EmissionsFactor = {
  mode: TransportMode;
  /** Shared-capacity emissions per tonne-kilometre. */
  kgCo2PerTonneKm: number;
  /** Baseline: a dedicated vehicle making the trip just for this shipment. */
  dedicatedVehicleKgCo2PerKm: number;
  source: string;
};

/**
 * Placeholder factors for the prototype, kept identical to the Supabase migration.
 * Replace with sourced values (e.g. UK government conversion factors) before relying on them.
 */
export const PROTOTYPE_EMISSIONS_FACTORS: readonly EmissionsFactor[] = [
  { mode: "road", kgCo2PerTonneKm: 0.105, dedicatedVehicleKgCo2PerKm: 0.25, source: "prototype placeholder" },
  { mode: "sea", kgCo2PerTonneKm: 0.016, dedicatedVehicleKgCo2PerKm: 1.2, source: "prototype placeholder" },
  { mode: "air", kgCo2PerTonneKm: 0.6, dedicatedVehicleKgCo2PerKm: 3.5, source: "prototype placeholder" },
];
