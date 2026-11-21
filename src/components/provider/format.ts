const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});
const number = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

export const formatPence = (pence: number) => money.format(pence / 100);
/** Listing times are entered and shown in UTC (see listing-validation). */
export const formatDateTime = (iso: string) => `${dateTime.format(new Date(iso))} UTC`;
export const formatNumber = (value: number) => number.format(value);
/** ISO timestamp → `datetime-local` value in UTC. */
export const toDateTimeLocal = (iso: string) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
export const poundsInput = (pence: number) => (pence / 100).toFixed(2);
export const shortId = (id: string) => id.replace(/-/g, "").slice(0, 8).toUpperCase();
