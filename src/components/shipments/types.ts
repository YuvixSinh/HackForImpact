import type { ApprovalReason } from "@/lib/domain/approval";
import type { PaymentStatus } from "@/lib/domain/booking";
import type { Id, IsoDateTime, Pence, TransportMode } from "@/lib/domain/common";

/** One ranked option as the shipment page shows it (built server-side). */
export type OptionView = {
  id: Id;
  rank: number;
  /** The provider listing this option would book. */
  listingId: Id;
  /** Null when the listing is no longer visible (e.g. its capacity ran out). */
  mode: TransportMode | null;
  departureAt: IsoDateTime | null;
  arrivalAt: IsoDateTime;
  totalPricePence: Pence;
  /** Plain-language capacity fit, e.g. "100 kg of 900 kg free". */
  capacityFit: string | null;
  deadlineMarginHours: number;
  co2Kg: number;
  co2SavedKg: number | null;
  isExactMatch: boolean;
  compromises: string[];
};

export type ApprovalView = {
  id: Id;
  reasons: ApprovalReason[];
  recommendedOptionId: Id | null;
};

export type BookingView = {
  reference: string;
  mode: TransportMode | null;
  route: string | null;
  pricePence: Pence;
  collectionAt: IsoDateTime;
  eta: IsoDateTime;
  co2Kg: number;
  co2SavedKg: number;
  receiptReference: string | null;
  paymentStatus: PaymentStatus;
};

/** A Server Function bound to a <form>; the client only posts ids. */
export type FormAction = (formData: FormData) => void | Promise<void>;
