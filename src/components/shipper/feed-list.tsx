import type { FeedItem, FeedTone } from "@/lib/feed/build";

const DOT: Record<FeedTone, string> = {
  info: "bg-ink-muted",
  success: "bg-brand",
  warning: "bg-accent-amber",
  danger: "bg-red-500",
};

const time = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

/** In-app shipment message feed, newest first. */
export function FeedList({ items }: { items: FeedItem[] }) {
  if (items.length === 0) return <p className="text-sm text-ink-muted">No updates yet. Ship something to see Autopilot at work.</p>;
  return (
    <ol className="space-y-3">
      {items.slice(0, 12).map((item) => (
        <li key={item.id} className="flex gap-3">
          <span aria-hidden="true" className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${DOT[item.tone]}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">{item.title}</p>
            {item.body ? <p className="text-sm text-ink-muted">{item.body}</p> : null}
            <p className="font-mono text-[11px] tabular-nums text-ink-muted">{time(item.at)} UTC</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
