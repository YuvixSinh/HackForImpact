"use client";

import { useActionState, useState } from "react";
import { createShipmentAction } from "@/app/actions/shipments";
import { FormError } from "@/components/auth/form-field";
import { parseShipmentForm, type ShipmentErrors, type ShipmentForm } from "@/lib/shipments/validation";
import { Check, Field, Select } from "./fields";

const MODES = [
  { value: "any", label: "Any mode (multi-leg allowed)" },
  { value: "road", label: "Road" },
  { value: "sea", label: "Sea" },
  { value: "air", label: "Air" },
];
const OPTIMISE = [
  { value: "balanced", label: "Balanced (price, CO₂, time)" },
  { value: "cheapest", label: "Cheapest" },
  { value: "fastest", label: "Fastest" },
  { value: "lowest_carbon", label: "Lowest carbon" },
];
const URGENCY = [
  { value: "standard", label: "Standard" },
  { value: "urgent", label: "Urgent" },
  { value: "critical", label: "Critical (always ask me)" },
];

/** Early feedback in the browser with the same rules the server enforces. */
function clientErrors(form: HTMLFormElement): ShipmentErrors | null {
  const data = new FormData(form);
  const value = (k: string) => (typeof data.get(k) === "string" ? (data.get(k) as string) : "");
  const keys = ["description", "modePreference", "length", "width", "height", "weightKg", "declaredValue", "fragile", "dangerousGoods", "pickupLocation", "destinationLocation", "readyAt", "deadlineAt", "budget", "urgency", "optimisation"];
  const result = parseShipmentForm(Object.fromEntries(keys.map((k) => [k, value(k)])) as ShipmentForm, new Date());
  return result.ok ? null : result.errors;
}

export function ShipmentForm() {
  const [state, action, pending] = useActionState(createShipmentAction, undefined);
  const [local, setLocal] = useState<ShipmentErrors | null>(null);
  const errors = local ?? state?.errors ?? {};
  const v = state?.values ?? {};

  return (
    <form
      action={action}
      noValidate
      onSubmit={(e) => {
        const found = clientErrors(e.currentTarget);
        setLocal(found);
        if (found) e.preventDefault();
      }}
      className="space-y-4"
    >
      <FormError message={local ? "Check the highlighted fields." : state?.message} />
      <Field name="description" label="Item description" defaultValue={v.description} error={errors.description} placeholder="e.g. 2 pallets of boxed ceramics" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="pickupLocation" label="Pickup" defaultValue={v.pickupLocation} error={errors.pickupLocation} placeholder="London" />
        <Field name="destinationLocation" label="Destination" defaultValue={v.destinationLocation} error={errors.destinationLocation} placeholder="Manchester" />
        <Field name="readyAt" label="Ready from (UTC)" type="datetime-local" defaultValue={v.readyAt} error={errors.readyAt} />
        <Field name="deadlineAt" label="Deliver by (UTC)" type="datetime-local" defaultValue={v.deadlineAt} error={errors.deadlineAt} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field name="length" label="Length cm" type="number" min="0" step="any" defaultValue={v.length} error={errors.length} />
        <Field name="width" label="Width cm" type="number" min="0" step="any" defaultValue={v.width} error={errors.width} />
        <Field name="height" label="Height cm" type="number" min="0" step="any" defaultValue={v.height} error={errors.height} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field name="weightKg" label="Weight kg" type="number" min="0" step="any" defaultValue={v.weightKg} error={errors.weightKg} />
        <Field name="declaredValue" label="Value £" type="number" min="0" step="any" defaultValue={v.declaredValue} error={errors.declaredValue} />
        <Field name="budget" label="Budget £" type="number" min="0" step="any" defaultValue={v.budget} error={errors.budget} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select name="modePreference" label="Transport" options={MODES} defaultValue={v.modePreference ?? "any"} error={errors.modePreference} />
        <Select name="optimisation" label="Optimise for" options={OPTIMISE} defaultValue={v.optimisation ?? "balanced"} error={errors.optimisation} />
        <Select name="urgency" label="Urgency" options={URGENCY} defaultValue={v.urgency ?? "standard"} error={errors.urgency} />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Check name="fragile" label="Fragile" defaultChecked={v.fragile === "on"} />
        <Check name="dangerousGoods" label="Dangerous goods (e.g. lithium batteries, fuel)" defaultChecked={v.dangerousGoods === "on"} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" name="intent" value="ship_it" disabled={pending} className="flex-1 rounded-full bg-brand px-4 py-2.5 font-medium text-brand-ink transition-[filter] hover:brightness-110 disabled:opacity-60">
          {pending ? "Working…" : "Ship it"}
        </button>
        <button type="submit" name="intent" value="compare" disabled={pending} className="flex-1 rounded-full border border-line px-4 py-2.5 font-medium text-ink transition-colors hover:border-brand disabled:opacity-60">
          Compare options myself
        </button>
      </div>
      <p className="font-mono text-[11px] text-ink-muted">Ship it lets Autopilot book when no approval rule applies; otherwise it asks you first.</p>
    </form>
  );
}
