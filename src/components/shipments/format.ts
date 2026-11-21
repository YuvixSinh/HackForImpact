import type { TransportMode } from "@/lib/domain/common";

export { formatPence } from "@/lib/matching/explain";

export const MODE_LABEL: Record<TransportMode, string> = { road: "Road", sea: "Sea", air: "Air" };

const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

/** Deterministic (UTC) so server and client renders match. */
export const formatDateTime = (iso: string) => `${dateTime.format(new Date(iso))} UTC`;

export function formatMargin(hours: number): string {
  const h = Math.round(hours);
  return h >= 0 ? `${h} h to spare` : `${-h} h late`;
}

export const formatKg = (kg: number) => `${Math.round(kg * 100) / 100} kg`;
