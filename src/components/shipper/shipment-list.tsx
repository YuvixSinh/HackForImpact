import Link from "next/link";
import type { Shipment, ShipmentStatus } from "@/lib/domain/shipment";

const STATUS: Record<ShipmentStatus, { label: string; className: string }> = {
  pending_match: { label: "Pending match", className: "text-ink-muted border-line" },
  awaiting_approval: { label: "Needs approval", className: "text-accent-amber border-accent-amber/50" },
  booked: { label: "Booked", className: "text-brand border-brand/50" },
  no_match: { label: "No match", className: "text-accent-bronze border-accent-bronze/50" },
  in_transit: { label: "In transit", className: "text-brand border-brand/50" },
  delivered: { label: "Delivered", className: "text-brand border-brand/50" },
  cancelled: { label: "Cancelled", className: "text-red-500 border-red-500/50" },
};

export function ShipmentList({ shipments }: { shipments: Shipment[] }) {
  if (shipments.length === 0) return <p className="text-sm text-ink-muted">No shipments yet.</p>;
  return (
    <ul className="divide-y divide-line">
      {[...shipments].reverse().map((s) => (
        <li key={s.id}>
          <Link href={`/shipper/shipments/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-brand">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{s.description}</span>
              <span className="block font-mono text-[11px] text-ink-muted">
                {s.pickupLocation} → {s.destinationLocation} · {s.weightKg} kg
              </span>
            </span>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px] ${STATUS[s.status].className}`}>
              {STATUS[s.status].label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
