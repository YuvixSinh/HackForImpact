import type { ModePreference, OptimisationPreference } from "@/lib/domain/common";
import type { NewShipment, Urgency } from "@/lib/domain/shipment";

/** Raw form values (strings), shared by the browser (early feedback) and the server (authoritative). */
export type ShipmentForm = {
  description: string;
  modePreference: string;
  length: string;
  width: string;
  height: string;
  weightKg: string;
  declaredValue: string;
  fragile: string;
  dangerousGoods: string;
  pickupLocation: string;
  destinationLocation: string;
  readyAt: string;
  deadlineAt: string;
  budget: string;
  urgency: string;
  optimisation: string;
};
export type ShipmentErrors = Partial<Record<keyof ShipmentForm, string>>;
export type ShipmentParseResult = { ok: true; shipment: NewShipment } | { ok: false; errors: ShipmentErrors };

export const MODE_OPTIONS = ["any", "road", "sea", "air"] as const satisfies readonly ModePreference[];
export const OPTIMISATION_OPTIONS = ["balanced", "cheapest", "fastest", "lowest_carbon"] as const satisfies readonly OptimisationPreference[];
export const URGENCY_OPTIONS = ["standard", "urgent", "critical"] as const satisfies readonly Urgency[];

const choice = <T extends string>(value: string, allowed: readonly T[]): T | null =>
  (allowed as readonly string[]).includes(value) ? (value as T) : null;

function positive(value: string, label: string): number | string {
  if (value.trim() === "") return `Enter the ${label}.`;
  const n = Number(value);
  if (!Number.isFinite(n)) return `Enter the ${label} as a number.`;
  if (n <= 0) return `The ${label} must be greater than 0.`;
  return n;
}

/** datetime-local values carry no zone; AutoShip treats them as UTC. Full ISO strings are accepted too. */
function instant(value: string, label: string): Date | string {
  if (value.trim() === "") return `Enter the ${label}.`;
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? `Enter a valid ${label}.` : date;
}

export function parseShipmentForm(form: ShipmentForm, now: Date): ShipmentParseResult {
  const errors: ShipmentErrors = {};
  const num = (key: keyof ShipmentForm, label: string) => {
    const v = positive(form[key], label);
    if (typeof v === "string") errors[key] = v;
    return typeof v === "number" ? v : 0;
  };

  const description = form.description.trim();
  if (description.length < 3) errors.description = "Describe the goods in at least 3 characters.";
  const modePreference = choice(form.modePreference, MODE_OPTIONS);
  if (!modePreference) errors.modePreference = "Choose road, sea, air, or any.";
  const optimisation = choice(form.optimisation, OPTIMISATION_OPTIONS);
  if (!optimisation) errors.optimisation = "Choose what to optimise for.";
  const urgency = choice(form.urgency, URGENCY_OPTIONS);
  if (!urgency) errors.urgency = "Choose standard, urgent, or critical.";

  const length = num("length", "length");
  const width = num("width", "width");
  const height = num("height", "height");
  const weightKg = num("weightKg", "total weight");
  const declaredValue = num("declaredValue", "declared value");
  const budget = num("budget", "budget");

  const pickupLocation = form.pickupLocation.trim();
  const destinationLocation = form.destinationLocation.trim();
  if (!pickupLocation) errors.pickupLocation = "Enter the pickup location.";
  if (!destinationLocation) errors.destinationLocation = "Enter the destination.";
  else if (pickupLocation.toLowerCase() === destinationLocation.toLowerCase()) {
    errors.destinationLocation = "Destination must be different from the pickup location.";
  }

  const ready = instant(form.readyAt, "ready time");
  const deadline = instant(form.deadlineAt, "delivery deadline");
  if (typeof ready === "string") errors.readyAt = ready;
  else if (ready.getTime() <= now.getTime()) errors.readyAt = "The ready time must be in the future.";
  if (typeof deadline === "string") errors.deadlineAt = deadline;
  else if (typeof ready !== "string" && deadline.getTime() <= ready.getTime()) {
    errors.deadlineAt = "The deadline must be after the ready time.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    shipment: {
      description,
      modePreference: modePreference!,
      dimensionsCm: { length, width, height },
      weightKg,
      declaredValuePence: Math.round(declaredValue * 100),
      fragile: form.fragile === "on" || form.fragile === "true",
      dangerousGoods: form.dangerousGoods === "on" || form.dangerousGoods === "true",
      pickupLocation,
      destinationLocation,
      readyAt: (ready as Date).toISOString(),
      deadlineAt: (deadline as Date).toISOString(),
      budgetPence: Math.round(budget * 100),
      urgency: urgency!,
      optimisation: optimisation!,
    },
  };
}
