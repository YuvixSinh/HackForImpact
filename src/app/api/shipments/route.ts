import type { NextRequest } from "next/server";
import { listShipments } from "@/lib/server/account-data";
import { ok, unauthorised } from "@/lib/server/api-responses";
import { viewerFromRequest } from "@/lib/server/session";

/** Read-only: the signed-in account's own shipments. */
export async function GET(request: NextRequest) {
  const viewer = await viewerFromRequest(request);
  if (!viewer) return unauthorised();
  return ok({ shipments: await listShipments(viewer) });
}
