"use server";

import { revalidatePath } from "next/cache";
import { bookOptionManually } from "@/app/shipper/shipments/manual-booking";
import { decideApproval } from "@/lib/bookings/service";
import type { AccessContext } from "@/lib/db/types";
import { getServices } from "@/lib/server/services";
import { requireDashboardViewer } from "@/lib/server/session";

// The client posts ids only. The viewer, policy checks, prices, and booking all resolve here.

async function shipperContext(): Promise<AccessContext> {
  const viewer = await requireDashboardViewer("shipper");
  return { accountId: viewer.account.id };
}

const deps = () => getServices();

const field = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" && value.length > 0 ? value : null;
};

function refresh(shipmentId: string | null) {
  if (shipmentId) revalidatePath(`/shipper/shipments/${shipmentId}`);
  revalidatePath("/shipper");
}

/** Approve the recommended option or a chosen alternative (`selectedOptionId`). */
export async function approveAction(formData: FormData): Promise<void> {
  const ctx = await shipperContext();
  const approvalId = field(formData, "approvalId");
  if (!approvalId) return;
  await decideApproval(deps(), ctx, {
    approvalId,
    decision: "approved",
    selectedOptionId: field(formData, "selectedOptionId") ?? undefined,
  });
  refresh(field(formData, "shipmentId"));
}

/** Decline: nothing is booked and no capacity is reserved. */
export async function declineAction(formData: FormData): Promise<void> {
  const ctx = await shipperContext();
  const approvalId = field(formData, "approvalId");
  if (!approvalId) return;
  await decideApproval(deps(), ctx, { approvalId, decision: "declined" });
  refresh(field(formData, "shipmentId"));
}

/** Manual "Book this option": policy-checked, so a flagged choice becomes an approval request. */
export async function bookOptionAction(formData: FormData): Promise<void> {
  const ctx = await shipperContext();
  const shipmentId = field(formData, "shipmentId");
  const optionId = field(formData, "optionId");
  if (!shipmentId || !optionId) return;
  await bookOptionManually(deps(), ctx, { shipmentId, optionId });
  refresh(shipmentId);
}
