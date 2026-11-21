"use client";

import { useEffect, useRef, useState } from "react";
import { pointAlong, type LatLng } from "@/lib/tracking/places";
import {
  fitZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  project,
  visibleTiles,
  type Point,
} from "@/lib/tracking/web-mercator";

const HEIGHT = 280;
const PADDING = 48;

type Props = {
  origin: string;
  destination: string;
  from: LatLng;
  to: LatLng;
  progress: number;
  label: string;
  disrupted?: boolean;
};

const midpoint = (a: LatLng, b: LatLng, zoom: number): Point => {
  const pa = project(a, zoom);
  const pb = project(b, zoom);
  return { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
};

/**
 * Interactive tracking map without a map library: OpenStreetMap raster tiles, drag to pan,
 * zoom buttons (or double-click), the route, and the simulated vehicle position.
 */
export function RouteMap({
  origin,
  destination,
  from,
  to,
  progress,
  label,
  disrupted = false,
}: Props) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [width, setWidth] = useState(600);
  const [view, setView] = useState<{ zoom: number; center: Point } | null>(
    null,
  );

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      setWidth(w);
      setView(
        (v) =>
          v ??
          (() => {
            const zoom = fitZoom(from, to, w, HEIGHT, PADDING);
            return { zoom, center: midpoint(from, to, zoom) };
          })(),
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [from, to]);

  const zoomBy = (dz: number) =>
    setView((v) => {
      if (!v) return v;
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom + dz));
      const f = 2 ** (zoom - v.zoom);
      return { zoom, center: { x: v.center.x * f, y: v.center.y * f } };
    });
  const recenter = () =>
    setView(() => {
      const zoom = fitZoom(from, to, width, HEIGHT, PADDING);
      return { zoom, center: midpoint(from, to, zoom) };
    });

  const toScreen = (p: LatLng): Point => {
    if (!view) return { x: 0, y: 0 };
    const w = project(p, view.zoom);
    return {
      x: w.x - view.center.x + width / 2,
      y: w.y - view.center.y + HEIGHT / 2,
    };
  };
  const a = toScreen(from);
  const b = toScreen(to);
  const van = toScreen(pointAlong(from, to, progress));
  const accent = disrupted ? "var(--accent-bronze)" : "var(--brand)";

  return (
    <figure className="overflow-hidden rounded-lg border border-line">
      <div
        ref={box}
        className="relative cursor-grab touch-none select-none bg-surface-muted active:cursor-grabbing"
        style={{ height: HEIGHT }}
        role="application"
        aria-label={`Map of the route from ${origin} to ${destination}: ${label}. Drag to pan.`}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x;
          const dy = e.clientY - drag.current.y;
          drag.current = { x: e.clientX, y: e.clientY };
          setView((v) =>
            v
              ? { ...v, center: { x: v.center.x - dx, y: v.center.y - dy } }
              : v,
          );
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onDoubleClick={() => zoomBy(1)}
      >
        {view && (
          <div className="absolute inset-0 dark:[filter:invert(1)_hue-rotate(180deg)_brightness(0.9)_contrast(0.9)]">
            {visibleTiles(view.center, view.zoom, width, HEIGHT).map((t) => (
              // eslint-disable-next-line @next/next/no-img-element -- raw map tiles, not page images
              <img
                key={t.key}
                src={`https://tile.openstreetmap.org/${view.zoom}/${t.x}/${t.y}.png`}
                alt=""
                draggable={false}
                width={256}
                height={256}
                className="pointer-events-none absolute max-w-none"
                style={{ left: t.left, top: t.top }}
              />
            ))}
          </div>
        )}
        {view && (
          <svg
            className="pointer-events-none absolute inset-0"
            width={width}
            height={HEIGHT}
            aria-hidden="true"
          >
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#555"
              strokeWidth={3}
              strokeDasharray="7 7"
            />
            <line
              x1={a.x}
              y1={a.y}
              x2={van.x}
              y2={van.y}
              stroke={accent}
              strokeWidth={4}
              strokeLinecap="round"
            />
            <circle
              cx={a.x}
              cy={a.y}
              r={6}
              fill="#fff"
              stroke="#222"
              strokeWidth={2}
            />
            <circle
              cx={b.x}
              cy={b.y}
              r={6}
              fill="#222"
              stroke="#fff"
              strokeWidth={2}
            />
            <circle
              cx={van.x}
              cy={van.y}
              r={14}
              fill={accent}
              opacity={0.25}
              className="motion-safe:animate-ping"
              style={{ transformOrigin: `${van.x}px ${van.y}px` }}
            />
            <circle
              cx={van.x}
              cy={van.y}
              r={8}
              fill={accent}
              stroke="#fff"
              strokeWidth={2}
            />
          </svg>
        )}
        <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-md border border-line bg-surface text-ink shadow">
          <button
            type="button"
            aria-label="Zoom in"
            className="h-8 w-8 text-lg hover:bg-surface-muted"
            onClick={() => zoomBy(1)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            className="h-8 w-8 border-t border-line text-lg hover:bg-surface-muted"
            onClick={() => zoomBy(-1)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            −
          </button>
          <button
            type="button"
            aria-label="Recentre on the route"
            className="h-8 w-8 border-t border-line text-sm hover:bg-surface-muted"
            onClick={recenter}
            onPointerDown={(e) => e.stopPropagation()}
          >
            ⌖
          </button>
        </div>
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-0 right-0 bg-surface/80 px-1.5 text-[10px] text-ink-muted"
          onPointerDown={(e) => e.stopPropagation()}
        >
          © OpenStreetMap contributors
        </a>
      </div>
      <figcaption className="flex justify-between gap-2 bg-surface px-3 py-2 text-xs text-ink-muted">
        <span>{origin}</span>
        <span className="font-medium text-ink">{label}</span>
        <span>{destination}</span>
      </figcaption>
    </figure>
  );
}
