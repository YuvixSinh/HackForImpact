"use client";

import { useActionState } from "react";
import type { ListingFormState } from "@/app/actions/provider";
import type { CapacityListing } from "@/lib/domain/capacity";
import { poundsInput, toDateTimeLocal } from "./format";

export type ListingFormAction = (previous: ListingFormState, form: FormData) => Promise<ListingFormState>;

type ListingFormProps = {
  action: ListingFormAction;
  /** When set, the form edits this listing; capacity totals are then read-only. */
  listing?: CapacityListing;
};

const inputClass =
  "w-full rounded-lg border border-line bg-background px-3 py-2 text-sm text-ink tabular-nums outline-none transition-[border-color,box-shadow] duration-200 focus:border-brand focus:ring-4 focus:ring-brand/15 aria-[invalid=true]:border-red-500 disabled:opacity-60";

function defaults(listing?: CapacityListing): Record<string, string> {
  if (!listing) return { mode: "road", recurrence: "one_off", status: "active", acceptsFragile: "on" };
  const flag = (value: boolean) => (value ? "on" : "");
  return {
    mode: listing.mode,
    origin: listing.origin,
    destination: listing.destination,
    departureAt: toDateTimeLocal(listing.departureAt),
    arrivalAt: toDateTimeLocal(listing.arrivalAt),
    recurrence: listing.recurrence,
    recurrenceRule: listing.recurrenceRule ?? "",
    totalCapacityKg: String(listing.totalCapacityKg),
    maxItemWeightKg: String(listing.maxItemWeightKg),
    lengthCm: String(listing.maxDimensionsCm.length),
    widthCm: String(listing.maxDimensionsCm.width),
    heightCm: String(listing.maxDimensionsCm.height),
    basePrice: poundsInput(listing.basePricePence),
    pricePerKg: poundsInput(listing.pricePerKgPence),
    distanceKm: String(listing.distanceKm),
    acceptsDangerousGoods: flag(listing.acceptsDangerousGoods),
    acceptsFragile: flag(listing.acceptsFragile),
    isReturnLeg: flag(listing.isReturnLeg),
    status: listing.status,
  };
}

export function ListingForm({ action, listing }: ListingFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const echo = state && !state.ok ? state.values : undefined;
  // Unchecked boxes are absent from a submission, so they are cleared rather than defaulted.
  const values = echo
    ? { ...defaults(listing), acceptsDangerousGoods: "", acceptsFragile: "", isReturnLeg: "", ...echo }
    : defaults(listing);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const prefix = listing ? `edit-${listing.id}` : "new-listing";
  const id = (name: string) => `${prefix}-${name}`;

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="space-y-1">
      <label htmlFor={id(name)} className="eyebrow block">
        {label}
      </label>
      <input
        id={id(name)}
        name={name}
        defaultValue={values[name] ?? ""}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? id(`${name}-error`) : undefined}
        className={inputClass}
        {...props}
      />
      {errors[name] ? (
        <p id={id(`${name}-error`)} className="text-xs text-red-600 dark:text-red-400">
          {errors[name]}
        </p>
      ) : null}
    </div>
  );

  const select = (name: string, label: string, options: [string, string][]) => (
    <div className="space-y-1">
      <label htmlFor={id(name)} className="eyebrow block">
        {label}
      </label>
      <select id={id(name)} name={name} defaultValue={values[name]} aria-invalid={errors[name] ? true : undefined} className={inputClass}>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      {errors[name] ? <p className="text-xs text-red-600 dark:text-red-400">{errors[name]}</p> : null}
    </div>
  );

  const checkbox = (name: string, label: string) => (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input type="checkbox" name={name} defaultChecked={values[name] === "on"} className="h-4 w-4 accent-[var(--brand)]" />
      {label}
    </label>
  );

  const positive = { type: "number", inputMode: "decimal" as const, min: 0, step: "any", required: true };

  return (
    // Remount after each result so defaults reflect the latest submission.
    <form key={JSON.stringify(state ?? null)} action={formAction} noValidate className="space-y-4">
      {listing ? <input type="hidden" name="listingId" value={listing.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {select("mode", "Mode", [
          ["road", "Road"],
          ["sea", "Sea"],
          ["air", "Air"],
        ])}
        {field("origin", "Origin", { required: true, autoComplete: "off" })}
        {field("destination", "Destination", { required: true, autoComplete: "off" })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("departureAt", "Departure (UTC)", { type: "datetime-local", required: true })}
        {field("arrivalAt", "Arrival (UTC)", { type: "datetime-local", required: true })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {select("recurrence", "Schedule", [
          ["one_off", "One-off"],
          ["recurring", "Recurring"],
        ])}
        {field("recurrenceRule", "Recurrence rule", { placeholder: "FREQ=WEEKLY;BYDAY=MO" })}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {listing
          ? field("totalCapacityKg", "Total kg", { ...positive, disabled: true, title: "Capacity is managed by AutoShip" })
          : field("totalCapacityKg", "Total kg", positive)}
        {field("maxItemWeightKg", "Max item kg", positive)}
        {field("lengthCm", "Max L cm", positive)}
        {field("widthCm", "Max W cm", positive)}
        {field("heightCm", "Max H cm", positive)}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {field("basePrice", "Base £", positive)}
        {field("pricePerKg", "Per kg £", positive)}
        {field("distanceKm", "Distance km", positive)}
        {select("status", "Status", [
          ["active", "Active"],
          ["paused", "Paused"],
          ["archived", "Archived"],
        ])}
      </div>
      <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
        <legend className="sr-only">Cargo accepted</legend>
        {checkbox("acceptsDangerousGoods", "Dangerous goods")}
        {checkbox("acceptsFragile", "Fragile items")}
        {checkbox("isReturnLeg", "Return leg")}
      </fieldset>
      {state ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={state.ok ? "text-sm text-brand" : "text-sm text-red-600 dark:text-red-400"}
        >
          {state.ok ? state.message : state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-ink transition-[filter,opacity] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Saving…" : listing ? "Save changes" : "Publish listing"}
      </button>
    </form>
  );
}
