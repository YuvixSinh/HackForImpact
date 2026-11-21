"use server";

import { revalidatePath } from "next/cache";
import type { BookingService } from "@/lib/autopilot/run";
import { createBookingService } from "@/lib/bookings/service";
import { AccessError } from "@/lib/db/types";
import type { TrackingStatus } from "@/lib/domain/tracking";
import { createPaymentAdapter } from "@/lib/payments";
import { getAppContext } from "@/lib/server/app-context";
import { requireDashboardViewer } from "@/lib/server/session";
import { postStatus, TrackingTransitionError } from "@/lib/tracking/service";

export type TrackingActionState = { ok: true; message: string } | { ok: false; error: string } | undefined;

const STATUSES: readonly TrackingStatus[] = ["collected", "in_transit", "delayed", "delivered", "cancelled"];

const REMATCH_MESSAGES = {
  rebooked: "Status saved. Autopilot rebooked the shipment on another provider.",
  approval_required: "Status saved. The shipper has been asked to approve a replacement.",
  booking_failed: "Status saved. Autopilot could not rebook automatically.",
  not_needed: "Status saved.",
} as const;

/** Uses the app's booking service when one is registered, otherwise builds the default one. */
function bookingService(): BookingService {
  const ctx = getAppContext() as ReturnType<typeof getAppContext> & { booking?: BookingService };
  return ctx.booking ?? createBookingService({ repos: ctx.repos, payments: createPaymentAdapter() });
}

/** Provider dashboard: post a tracking status for one of the provider's bookings. */
export async function postTrackingStatusAction(
  _previous: TrackingActionState,
  form: FormData,
): Promise<TrackingActionState> {
  const viewer = await requireDashboardViewer("provider");
  const bookingId = form.get("bookingId");
  const status = form.get("status");
  const etaRaw = form.get("eta");
  const message = form.get("message");
  if (typeof bookingId !== "string" || !bookingId) return { ok: false, error: "Choose a booking." };
  if (typeof status !== "string" || !STATUSES.includes(status as TrackingStatus)) {
    return { ok: false, error: "Choose a status." };
  }
  let eta: string | null = null;
  if (typeof etaRaw === "string" && etaRaw) {
    const parsed = new Date(etaRaw);
    if (Number.isNaN(parsed.getTime())) return { ok: false, error: "Enter a valid new ETA." };
    eta = parsed.toISOString();
  }
  if (status === "delayed" && !eta) return { ok: false, error: "Enter the new ETA for the delay." };

  try {
    const { repos } = getAppContext();
    const result = await postStatus({ repos, booking: bookingService() }, { accountId: viewer.account.id }, {
      bookingId,
      status: status as TrackingStatus,
      message: typeof message === "string" ? message : undefined,
      eta,
    });
    revalidatePath("/provider");
    revalidatePath("/shipper");
    return { ok: true, message: REMATCH_MESSAGES[result.rematch] };
  } catch (error) {
    if (error instanceof TrackingTransitionError) return { ok: false, error: error.message };
    if (error instanceof AccessError) return { ok: false, error: "Booking not found." };
    throw error;
  }
}
