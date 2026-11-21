import { CarbonMeter } from "@/components/shipper/carbon-meter";
import type { Booking } from "@/lib/domain/booking";
import { summariseCarbon } from "@/lib/sustainability/summary";

/** Server-side composition: confirmed bookings → monthly/yearly carbon summary. */
export function CarbonSlot({ bookings }: { bookings: Booking[] }) {
  return <CarbonMeter summary={summariseCarbon(bookings, new Date())} />;
}
