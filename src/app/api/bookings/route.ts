import type { NextRequest } from "next/server";
import { listBookings } from "@/lib/server/account-data";
import { ok, unauthorised } from "@/lib/server/api-responses";
import { viewerFromRequest } from "@/lib/server/session";

/** Read-only: bookings where the signed-in account is the shipper or the provider. */
export async function GET(request: NextRequest) {
  const viewer = await viewerFromRequest(request);
  if (!viewer) return unauthorised();
  return ok({ bookings: await listBookings(viewer) });
}
