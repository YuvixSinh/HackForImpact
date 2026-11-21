import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import { GET as getBooking } from "@/app/api/bookings/[id]/route";
import { GET as listBookings } from "@/app/api/bookings/route";
import { GET as getShipment } from "@/app/api/shipments/[id]/route";
import { GET as listShipments } from "@/app/api/shipments/route";
import type { SignupRole } from "@/lib/auth/roles";
import { getAppContext } from "@/lib/server/app-context";
import { SESSION_COOKIE } from "@/lib/server/session-cookie";
import { listingInput, reservationPricing, shipmentInput } from "../../fixtures/domain";

/**
 * Server-side account isolation through the real route handlers, session cookie, auth
 * service, and repositories (local demo auth + in-memory store; no network).
 */
describe("account isolation through the API", () => {
  const cookies: Record<string, string> = {};
  let shipmentId: string;
  let bookingId: string;

  async function signUp(name: string, role: SignupRole) {
    const result = await getAppContext().auth.signUp({
      role,
      accountName: name,
      email: `${name}-${crypto.randomUUID()}@example.test`,
      password: "integration-password",
    });
    if (!result.ok) throw new Error(result.error);
    cookies[name] = `${SESSION_COOKIE}=${result.token}`;
    return { accountId: result.viewer.account.id };
  }

  beforeAll(async () => {
    const shipperA = await signUp("shipperA", "business-shipper");
    await signUp("shipperB", "individual-shipper");
    const provider = await signUp("provider", "provider");
    await signUp("otherProvider", "provider");
    const { repos } = getAppContext();
    const now = new Date();
    shipmentId = (await repos.shipments.create(shipperA, shipmentInput(now))).id;
    const listing = await repos.capacity.create(provider, listingInput(now));
    const reserved = await repos.bookings.reserve(shipperA, { shipmentId, listingId: listing.id, ...reservationPricing });
    if (!reserved.ok) throw new Error(reserved.reason);
    bookingId = reserved.booking.id;
  });

  const request = (path: string, who?: string) =>
    new NextRequest(`http://localhost${path}`, { headers: who ? { cookie: cookies[who] } : {} });
  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  it("returns a shipment to its owner only", async () => {
    expect((await getShipment(request(`/api/shipments/${shipmentId}`, "shipperA"), params(shipmentId))).status).toBe(200);
    expect((await getShipment(request(`/api/shipments/${shipmentId}`, "shipperB"), params(shipmentId))).status).toBe(404);
    expect((await getShipment(request(`/api/shipments/${shipmentId}`, "provider"), params(shipmentId))).status).toBe(404);
  });

  it("returns a booking to its shipper and provider only", async () => {
    const as = async (who: string) => (await getBooking(request(`/api/bookings/${bookingId}`, who), params(bookingId))).status;
    expect(await as("shipperA")).toBe(200);
    expect(await as("provider")).toBe(200);
    expect(await as("shipperB")).toBe(404);
    expect(await as("otherProvider")).toBe(404);
  });

  it("lists only the caller's own shipments and bookings", async () => {
    const ids = async (res: Response, key: string) => ((await res.json())[key] as { id: string }[]).map((r) => r.id);
    expect(await ids(await listShipments(request("/api/shipments", "shipperA")), "shipments")).toEqual([shipmentId]);
    expect(await ids(await listShipments(request("/api/shipments", "shipperB")), "shipments")).toEqual([]);
    expect(await ids(await listBookings(request("/api/bookings", "provider")), "bookings")).toEqual([bookingId]);
    expect(await ids(await listBookings(request("/api/bookings", "otherProvider")), "bookings")).toEqual([]);
  });

  it("rejects visitors without a valid session", async () => {
    expect((await listShipments(request("/api/shipments"))).status).toBe(401);
    expect((await getShipment(request(`/api/shipments/${shipmentId}`), params(shipmentId))).status).toBe(401);
    const forged = new NextRequest(`http://localhost/api/bookings/${bookingId}`, {
      headers: { cookie: `${SESSION_COOKIE}=forged.token` },
    });
    expect((await getBooking(forged, params(bookingId))).status).toBe(401);
  });
});
