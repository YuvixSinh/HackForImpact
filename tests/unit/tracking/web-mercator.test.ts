import { describe, expect, it } from "vitest";
import { fitZoom, project, TILE_SIZE, visibleTiles } from "@/lib/tracking/web-mercator";

describe("web mercator helpers for the tracking map", () => {
  it("projects lat/lng to world pixels at a zoom level", () => {
    expect(project({ lat: 0, lng: 0 }, 0)).toEqual({ x: 128, y: 128 });
    const london = project({ lat: 51.5074, lng: -0.1278 }, 10);
    expect(london.x).toBeCloseTo(130981, -1);
    expect(london.y).toBeCloseTo(87170, -1);
  });

  it("picks the largest zoom that fits both points with padding", () => {
    const bristol = { lat: 51.4545, lng: -2.5879 };
    const london = { lat: 51.5074, lng: -0.1278 };
    const z = fitZoom(bristol, london, 600, 280, 48);
    const span = project(london, z).x - project(bristol, z).x;
    expect(span).toBeLessThanOrEqual(600 - 96);
    expect(project(london, z + 1).x - project(bristol, z + 1).x).toBeGreaterThan(600 - 96);
  });

  it("lists the tiles covering a viewport, repeating the world horizontally and skipping rows outside it", () => {
    const tiles = visibleTiles({ x: 128, y: 128 }, 0, 512, 512);
    expect(tiles).toEqual([
      { x: 0, y: 0, left: -128, top: 128, key: "0/-1/0" },
      { x: 0, y: 0, left: 128, top: 128, key: "0/0/0" },
      { x: 0, y: 0, left: 384, top: 128, key: "0/1/0" },
    ]);
    expect(TILE_SIZE).toBe(256);
  });
});
