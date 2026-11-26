"use client";

import { useActionState } from "react";
import { postTrackingStatusAction } from "@/app/actions/tracking";
import type { TrackingStatus } from "@/lib/domain/tracking";

const BUTTONS: { status: TrackingStatus; label: string }[] = [
  { status: "collected", label: "Collected" },
  { status: "in_transit", label: "In transit" },
  { status: "delivered", label: "Delivered" },
];

/**
 * Provider status buttons for one booking. `allowed` (from `allowedNextStatuses`) disables
 * buttons that are not valid next; the server validates again either way.
 */
export function StatusActions({ bookingId, allowed }: { bookingId: string; allowed?: readonly TrackingStatus[] }) {
  const [state, action, pending] = useActionState(postTrackingStatusAction, undefined);
  const can = (s: TrackingStatus) => !pending && (!allowed || allowed.includes(s));
  const button = "min-h-10 rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <form action={action} className="space-y-2" aria-label="Update tracking status">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="flex flex-wrap gap-2">
        {BUTTONS.map((b) => (
          <button key={b.status} type="submit" name="status" value={b.status} disabled={!can(b.status)} className={`${button} bg-brand text-brand-ink`}>
            {b.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-ink-muted">
          New ETA for delays (UTC)
          <input type="datetime-local" name="eta" className="mt-1 block rounded-md border border-line bg-surface px-2 py-1 text-sm text-ink" />
        </label>
        <button type="submit" name="status" value="delayed" disabled={!can("delayed")} className={`${button} border border-accent-amber text-ink`}>
          Report delay
        </button>
        <button type="submit" name="status" value="cancelled" disabled={!can("cancelled")} className={`${button} border border-accent-bronze text-ink`}>
          Cancel booking
        </button>
      </div>
      <p aria-live="polite" className={`text-sm ${state?.ok === false ? "text-accent-bronze" : "text-ink-muted"}`}>
        {state ? (state.ok ? state.message : state.error) : null}
      </p>
    </form>
  );
}
