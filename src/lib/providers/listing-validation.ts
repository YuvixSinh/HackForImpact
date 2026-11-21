import type { CapacityListingPatch, ListingStatus, NewCapacityListing, Recurrence } from "@/lib/domain/capacity";
import { TRANSPORT_MODES, type TransportMode } from "@/lib/domain/common";

/** Raw listing form values: FormData from a Server Action, or a plain record in tests. */
export type ListingFormInput = FormData | Record<string, string | undefined>;

export type ListingFieldErrors = Partial<Record<string, string>>;

export type ListingParseResult<T> = { ok: true; value: T } | { ok: false; fieldErrors: ListingFieldErrors };

export const LISTING_STATUSES: readonly ListingStatus[] = ["active", "paused", "archived"];
const RECURRENCES: readonly Recurrence[] = ["one_off", "recurring"];

function reader(input: ListingFormInput) {
  return (name: string): string => {
    const value = input instanceof FormData ? input.get(name) : input[name];
    return typeof value === "string" ? value.trim() : "";
  };
}

/**
 * `datetime-local` values carry no zone; they are read as UTC so the server's own time zone
 * never shifts a provider's schedule. Values that already include a zone are respected.
 */
function parseDateTime(value: string): string | null {
  if (!value) return null;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseEditable(input: ListingFormInput, fieldErrors: ListingFieldErrors) {
  const get = reader(input);

  const number = (name: string, label: string, { allowZero = false } = {}): number => {
    const raw = get(name);
    const value = raw === "" ? Number.NaN : Number(raw);
    if (!Number.isFinite(value) || value < 0 || (!allowZero && value === 0)) {
      fieldErrors[name] = allowZero ? `${label} must be zero or more.` : `${label} must be a positive number.`;
    }
    return value;
  };
  const pence = (name: string, label: string) => Math.round(number(name, label, { allowZero: true }) * 100);

  const mode = get("mode") as TransportMode;
  if (!TRANSPORT_MODES.includes(mode)) fieldErrors.mode = "Choose road, sea, or air.";

  const origin = get("origin");
  if (!origin) fieldErrors.origin = "Enter the origin.";
  const destination = get("destination");
  if (!destination) fieldErrors.destination = "Enter the destination.";

  const departureAt = parseDateTime(get("departureAt"));
  if (!departureAt) fieldErrors.departureAt = "Enter a valid departure time.";
  const arrivalAt = parseDateTime(get("arrivalAt"));
  if (!arrivalAt) fieldErrors.arrivalAt = "Enter a valid arrival time.";
  else if (departureAt && Date.parse(arrivalAt) <= Date.parse(departureAt)) {
    fieldErrors.arrivalAt = "Arrival must be after departure.";
  }

  const recurrence = get("recurrence") as Recurrence;
  if (!RECURRENCES.includes(recurrence)) fieldErrors.recurrence = "Choose one-off or recurring.";
  const rule = get("recurrenceRule");
  if (recurrence === "recurring" && !rule) fieldErrors.recurrenceRule = "Recurring services need a rule, e.g. FREQ=WEEKLY.";

  const status = (get("status") || "active") as ListingStatus;
  if (!LISTING_STATUSES.includes(status)) fieldErrors.status = "Choose a valid status.";

  const flag = (name: string) => ["on", "true", "1"].includes(get(name).toLowerCase());

  const value: CapacityListingPatch & Required<Pick<CapacityListingPatch, "maxItemWeightKg">> = {
    mode,
    origin,
    destination,
    departureAt: departureAt ?? "",
    arrivalAt: arrivalAt ?? "",
    recurrence,
    recurrenceRule: recurrence === "recurring" ? rule : null,
    maxItemWeightKg: number("maxItemWeightKg", "Max item weight"),
    maxDimensionsCm: {
      length: number("lengthCm", "Length"),
      width: number("widthCm", "Width"),
      height: number("heightCm", "Height"),
    },
    basePricePence: pence("basePrice", "Base price"),
    pricePerKgPence: pence("pricePerKg", "Price per kg"),
    distanceKm: number("distanceKm", "Distance"),
    acceptsDangerousGoods: flag("acceptsDangerousGoods"),
    acceptsFragile: flag("acceptsFragile"),
    isReturnLeg: flag("isReturnLeg"),
    status,
  };
  return { value, get, number };
}

/** Parses a new listing. Remaining capacity is not an input: the repository sets it to the total. */
export function parseListingForm(input: ListingFormInput): ListingParseResult<NewCapacityListing> {
  const fieldErrors: ListingFieldErrors = {};
  const { value, number } = parseEditable(input, fieldErrors);
  const totalCapacityKg = number("totalCapacityKg", "Total capacity");
  if (!fieldErrors.totalCapacityKg && !fieldErrors.maxItemWeightKg && value.maxItemWeightKg > totalCapacityKg) {
    fieldErrors.maxItemWeightKg = "Max item weight cannot exceed total capacity.";
  }
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, value: { ...(value as Omit<NewCapacityListing, "totalCapacityKg">), totalCapacityKg } };
}

/**
 * Parses an edit. Capacity figures stay server-controlled: total and remaining capacity are
 * never read from the form, whatever it contains.
 */
export function parseListingPatchForm(input: ListingFormInput): ListingParseResult<CapacityListingPatch> {
  const fieldErrors: ListingFieldErrors = {};
  const { value } = parseEditable(input, fieldErrors);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, value };
}
