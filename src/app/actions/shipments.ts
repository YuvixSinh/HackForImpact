"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseThresholds, type ThresholdErrors } from "@/lib/policy/thresholds";
import { submitShipment, type SubmitIntent } from "@/lib/shipments/intake";
import type { ShipmentErrors, ShipmentForm } from "@/lib/shipments/validation";
import { getServices } from "@/lib/server/services";
import { requireDashboardViewer } from "@/lib/server/session";

export type ShipmentFormState = { errors?: ShipmentErrors; message?: string; values?: Partial<ShipmentForm> } | undefined;

const FIELDS: (keyof ShipmentForm)[] = [
  "description", "modePreference", "length", "width", "height", "weightKg", "declaredValue", "fragile",
  "dangerousGoods", "pickupLocation", "destinationLocation", "readyAt", "deadlineAt", "budget", "urgency", "optimisation",
];

const read = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
};

export async function createShipmentAction(_prev: ShipmentFormState, form: FormData): Promise<ShipmentFormState> {
  const viewer = await requireDashboardViewer("shipper");
  const values = Object.fromEntries(FIELDS.map((k) => [k, read(form, k)])) as ShipmentForm;
  const intent: SubmitIntent = read(form, "intent") === "compare" ? "compare" : "ship_it";
  const services = getServices();
  const result = await submitShipment(
    { repos: services.repos, booking: services.booking, now: new Date() },
    { accountId: viewer.account.id },
    values,
    intent,
  );
  if (!result.ok) return { errors: result.errors, message: "Check the highlighted fields.", values };
  revalidatePath("/shipper");
  redirect(`/shipper/shipments/${result.shipmentId}`);
}

export type PolicyFormState = { errors?: ThresholdErrors; message?: string } | undefined;

export async function savePolicyAction(_prev: PolicyFormState, form: FormData): Promise<PolicyFormState> {
  const viewer = await requireDashboardViewer("shipper");
  const parsed = parseThresholds({
    maxAutoPrice: read(form, "maxAutoPrice"),
    declaredValueThreshold: read(form, "declaredValueThreshold"),
    minDeadlineMarginHours: read(form, "minDeadlineMarginHours"),
  });
  if (!parsed.ok) return { errors: parsed.errors, message: "Check the highlighted fields." };
  await getServices().repos.policies.save({ accountId: viewer.account.id }, parsed.thresholds);
  revalidatePath("/shipper");
  return { message: "Approval thresholds saved." };
}
