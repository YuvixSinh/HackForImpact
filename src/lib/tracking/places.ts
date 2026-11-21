/**
 * Static coordinates for the demo's place names, so the tracking map works without a
 * geocoding service. Unknown names return null and the page falls back to the simple route line.
 */
export type LatLng = { lat: number; lng: number };

const PLACES: Record<string, LatLng> = {
  london: { lat: 51.5074, lng: -0.1278 },
  manchester: { lat: 53.4808, lng: -2.2426 },
  bristol: { lat: 51.4545, lng: -2.5879 },
  birmingham: { lat: 52.4862, lng: -1.8904 },
  leeds: { lat: 53.8008, lng: -1.5491 },
  liverpool: { lat: 53.4084, lng: -2.9916 },
  edinburgh: { lat: 55.9533, lng: -3.1883 },
  glasgow: { lat: 55.8642, lng: -4.2518 },
  southampton: { lat: 50.9097, lng: -1.4044 },
  felixstowe: { lat: 51.9617, lng: 1.3513 },
  dover: { lat: 51.1279, lng: 1.3134 },
  rotterdam: { lat: 51.9244, lng: 4.4777 },
  hamburg: { lat: 53.5511, lng: 9.9937 },
  paris: { lat: 48.8566, lng: 2.3522 },
  monza: { lat: 45.5845, lng: 9.2744 },
};

export function placeCoordinates(name: string): LatLng | null {
  return PLACES[name.trim().toLowerCase()] ?? null;
}

export function routeCoordinates(origin: string, destination: string): { from: LatLng; to: LatLng } | null {
  const from = placeCoordinates(origin);
  const to = placeCoordinates(destination);
  return from && to ? { from, to } : null;
}

/** Straight-line position between two points at `progress` (clamped to 0–1). */
export function pointAlong(from: LatLng, to: LatLng, progress: number): LatLng {
  const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  return { lat: from.lat + (to.lat - from.lat) * p, lng: from.lng + (to.lng - from.lng) * p };
}
