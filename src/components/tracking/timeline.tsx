import type { TrackingEvent, TrackingStatus } from "@/lib/domain/tracking";
import { timelineFor } from "@/lib/tracking/simulate";

const LABELS: Record<TrackingStatus, string> = {
  booked: "Booked",
  collected: "Collected",
  in_transit: "In transit",
  delayed: "Delayed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

/** Status timeline for one booking, oldest first. Delays and cancellations are highlighted. */
export function TrackingTimeline({ events, bookedAt }: { events: readonly TrackingEvent[]; bookedAt?: string }) {
  const ordered = timelineFor(events);
  return (
    <ol className="space-y-3" aria-label="Tracking timeline">
      {bookedAt ? (
        <TimelineItem status="booked" label={LABELS.booked} time={formatTime(bookedAt)} message="Booking confirmed" />
      ) : null}
      {ordered.map((event) => (
        <TimelineItem
          key={event.id}
          status={event.status}
          label={LABELS[event.status]}
          time={formatTime(event.occurredAt)}
          message={event.message}
          eta={event.eta ? formatTime(event.eta) : null}
        />
      ))}
      {!bookedAt && ordered.length === 0 ? <li className="text-sm text-ink-muted">No tracking updates yet.</li> : null}
    </ol>
  );
}

function TimelineItem(props: { status: TrackingStatus; label: string; time: string; message: string; eta?: string | null }) {
  const alert = props.status === "delayed" || props.status === "cancelled";
  const tone =
    props.status === "cancelled"
      ? "border-accent-bronze bg-accent-bronze/10"
      : props.status === "delayed"
        ? "border-accent-amber bg-accent-amber/10"
        : "border-line bg-surface";
  const dot =
    props.status === "cancelled" ? "bg-accent-bronze" : props.status === "delayed" ? "bg-accent-amber" : props.status === "delivered" ? "bg-accent-forest" : "bg-brand";
  return (
    <li className={`flex gap-3 rounded-lg border p-3 ${tone}`}>
      <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-sm font-semibold text-ink">
            {props.label}
            {alert ? <span className="sr-only"> (attention)</span> : null}
          </p>
          <time className="text-xs text-ink-muted">{props.time} UTC</time>
        </div>
        {props.message ? <p className="mt-0.5 text-sm text-ink-muted">{props.message}</p> : null}
        {props.eta ? <p className="mt-0.5 text-xs font-medium text-ink">New ETA: {props.eta} UTC</p> : null}
      </div>
    </li>
  );
}
