import type { CapacityListing } from "@/lib/domain/capacity";
import { formatDateTime, formatNumber, formatPence } from "./format";
import { ListingForm, type ListingFormAction } from "./listing-form";

type ListingListProps = {
  listings: CapacityListing[];
  updateAction?: ListingFormAction;
  statusAction?: (form: FormData) => Promise<void>;
};

const STATUS_DOT: Record<CapacityListing["status"], string> = {
  active: "bg-brand",
  paused: "bg-accent-amber",
  archived: "bg-ink-muted",
};

export function CapacityBar({ remaining, total }: { remaining: number; total: number }) {
  const percent = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-ink-muted tabular-nums">
        <span>
          <span className="font-medium text-ink">{formatNumber(remaining)}</span> / {formatNumber(total)} kg left
        </span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div
        role="meter"
        aria-label="Remaining capacity"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={remaining}
        className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function ListingList({ listings, updateAction, statusAction }: ListingListProps) {
  if (listings.length === 0) {
    return <p className="text-sm text-ink-muted">No listings yet. Publish your first service above.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {listings.map((listing) => (
        <li key={listing.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-ink">
                {listing.origin} → {listing.destination}
              </p>
              <p className="text-xs text-ink-muted tabular-nums">
                <span className="uppercase">{listing.mode}</span> · {formatDateTime(listing.departureAt)} →{" "}
                {formatDateTime(listing.arrivalAt)}
                {listing.recurrence === "recurring" ? ` · ${listing.recurrenceRule}` : ""}
                {listing.isReturnLeg ? " · return leg" : ""}
              </p>
              <p className="text-xs text-ink-muted tabular-nums">
                {formatPence(listing.basePricePence)} + {formatPence(listing.pricePerKgPence)}/kg · {formatNumber(listing.distanceKm)} km
              </p>
            </div>
            <span className="eyebrow flex items-center gap-1.5">
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[listing.status]}`} />
              {listing.status}
            </span>
          </div>
          <CapacityBar remaining={listing.remainingCapacityKg} total={listing.totalCapacityKg} />
          <div className="flex flex-wrap items-start gap-3">
            {statusAction && listing.status !== "archived" ? (
              <form action={statusAction}>
                <input type="hidden" name="listingId" value={listing.id} />
                <input type="hidden" name="status" value={listing.status === "active" ? "paused" : "active"} />
                <button
                  type="submit"
                  className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink hover:bg-surface-muted"
                >
                  {listing.status === "active" ? "Pause" : "Resume"}
                </button>
              </form>
            ) : null}
            {updateAction ? (
              <details className="w-full">
                <summary className="cursor-pointer text-xs font-medium text-ink-muted hover:text-ink">Edit listing</summary>
                <div className="mt-3 rounded-xl border border-line bg-surface-muted/40 p-4">
                  <ListingForm action={updateAction} listing={listing} />
                </div>
              </details>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
