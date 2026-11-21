import type { LatLng } from "./places";

/** Web Mercator maths for the dependency-free tracking map (standard 256 px slippy-map tiles). */
export const TILE_SIZE = 256;
export const MIN_ZOOM = 3;
export const MAX_ZOOM = 16;

export type Point = { x: number; y: number };

/** World pixel position of a coordinate at `zoom`. */
export function project({ lat, lng }: LatLng, zoom: number): Point {
  const scale = TILE_SIZE * 2 ** zoom;
  const sin = Math.sin((Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

/** Largest integer zoom where both points fit inside the viewport minus `padding` on each side. */
export function fitZoom(a: LatLng, b: LatLng, width: number, height: number, padding: number): number {
  for (let z = MAX_ZOOM; z > MIN_ZOOM; z--) {
    const pa = project(a, z);
    const pb = project(b, z);
    if (Math.abs(pa.x - pb.x) <= width - 2 * padding && Math.abs(pa.y - pb.y) <= height - 2 * padding) return z;
  }
  return MIN_ZOOM;
}

export type Tile = { x: number; y: number; left: number; top: number; key: string };

/** Tiles covering a viewport (the world repeats horizontally) centred on world pixel `center`, with their offsets in the viewport. */
export function visibleTiles(center: Point, zoom: number, width: number, height: number): Tile[] {
  const count = 2 ** zoom;
  const originX = center.x - width / 2;
  const originY = center.y - height / 2;
  const tiles: Tile[] = [];
  for (let ty = Math.floor(originY / TILE_SIZE); ty * TILE_SIZE < originY + height; ty++) {
    if (ty < 0 || ty >= count) continue;
    for (let tx = Math.floor(originX / TILE_SIZE); tx * TILE_SIZE < originX + width; tx++) {
      const wrapped = ((tx % count) + count) % count;
      tiles.push({ x: wrapped, y: ty, left: tx * TILE_SIZE - originX, top: ty * TILE_SIZE - originY, key: `${zoom}/${tx}/${ty}` });
    }
  }
  return tiles;
}
