import type { Booking, BookingStatus, PaymentStatus } from "@/lib/domain/booking";

/** A `public.bookings` row as returned by PostgREST or `to_jsonb`. */
export type BookingRow = {
  id: string;
  shipper_account_id: string;
  provider_account_id: string;
  shipment_id: string;
  capacity_listing_id: string;
  match_option_id: string | null;
  reserved_weight_kg: number | string;
  price_pence: number | string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  receipt_reference: string | null;
  collection_at: string;
  eta: string;
  co2_kg: number | string;
  co2_saved_kg: number | string;
  created_at: string;
  updated_at: string;
};

const iso = (value: string) => new Date(value).toISOString();

export function bookingFromRow(row: BookingRow): Booking {
  return {
    id: row.id,
    shipperAccountId: row.shipper_account_id,
    providerAccountId: row.provider_account_id,
    shipmentId: row.shipment_id,
    capacityListingId: row.capacity_listing_id,
    matchOptionId: row.match_option_id,
    reservedWeightKg: Number(row.reserved_weight_kg),
    pricePence: Number(row.price_pence),
    status: row.status,
    paymentStatus: row.payment_status,
    paymentReference: row.payment_reference,
    receiptReference: row.receipt_reference,
    collectionAt: iso(row.collection_at),
    eta: iso(row.eta),
    co2Kg: Number(row.co2_kg),
    co2SavedKg: Number(row.co2_saved_kg),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}
