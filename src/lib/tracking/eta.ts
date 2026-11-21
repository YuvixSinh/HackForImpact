/**
 * Parses the provider's "new ETA" input. A zone-less `datetime-local` value is read as UTC, like
 * every other AutoShip form, so the result does not depend on the server's time zone.
 */
export function parseTrackingEta(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
