import { describe, expect, it } from "vitest";
import { pointAlong, routeCoordinates } from "@/lib/tracking/places";

describe("demo place coordinates", () => {
  it("resolves known demo cities case-insensitively", () => {
    const route = routeCoordinates(" bristol ", "LONDON");
    expect(route).not.toBeNull();
    expect(route!.from.lat).toBeCloseTo(51.45, 1);
    expect(route!.to.lng).toBeCloseTo(-0.13, 1);
  });

  it("returns null when either place is unknown, so the page can fall back", () => {
    expect(routeCoordinates("Atlantis", "London")).toBeNull();
  });

  it("interpolates the vehicle position along the route and clamps progress", () => {
    const from = { lat: 50, lng: -2 };
    const to = { lat: 52, lng: 0 };
    expect(pointAlong(from, to, 0.5)).toEqual({ lat: 51, lng: -1 });
    expect(pointAlong(from, to, -1)).toEqual(from);
    expect(pointAlong(from, to, 2)).toEqual(to);
  });
});
