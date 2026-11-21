import type { NextRequest } from "next/server";
import { getBooking } from "@/lib/server/account-data";
import { notFound, ok, unauthorised } from "@/lib/server/api-responses";
import { viewerFromRequest } from "@/lib/server/session";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await viewerFromRequest(request);
  if (!viewer) return unauthorised();
  const booking = await getBooking(viewer, (await params).id);
  return booking ? ok({ booking }) : notFound();
}
