import "server-only";
import type { Viewer } from "@/lib/auth/service";
import type { AccessContext } from "@/lib/db/types";
import type { Booking } from "@/lib/domain/booking";
import type { Id } from "@/lib/domain/common";
import type { Shipment } from "@/lib/domain/shipment";
import { getAppContext } from "./app-context";

/**
 * Data access layer for pages and route handlers. The account context always comes from the
 * verified session, never from request input, so one account cannot name another's records.
 */
const contextFor = (viewer: Viewer): AccessContext => ({ accountId: viewer.account.id });

export function listShipments(viewer: Viewer): Promise<Shipment[]> {
  return getAppContext().repos.shipments.listForAccount(contextFor(viewer));
}

export function getShipment(viewer: Viewer, id: Id): Promise<Shipment | null> {
  return getAppContext().repos.shipments.getById(contextFor(viewer), id);
}

export function listBookings(viewer: Viewer): Promise<Booking[]> {
  return getAppContext().repos.bookings.listForAccount(contextFor(viewer));
}

export function getBooking(viewer: Viewer, id: Id): Promise<Booking | null> {
  return getAppContext().repos.bookings.getById(contextFor(viewer), id);
}
