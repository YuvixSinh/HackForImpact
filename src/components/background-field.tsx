"use client";

import { useEffect, useRef } from "react";
import { drawRouteField, type FieldPalette } from "./route-field";

const FRAME_MS = 1000 / 30; // A slow ambient field does not need more than 30 fps.
const STATIC_TIME = 42; // Snapshot time used for the reduced-motion still frame.

function readPalette(): FieldPalette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    line: v("--field-line", "rgba(128,128,128,0.2)"),
    node: v("--field-node", "#808080"),
    label: v("--field-label", "rgba(128,128,128,0.4)"),
    road: v("--field-road", "#6D9773"),
    sea: v("--field-sea", "#BB8A52"),
    air: v("--field-air", "#FFBA00"),
  };
}

/**
 * Decorative, fixed layer behind all content: a drifting dot grid (CSS transform) and a
 * canvas of freight routes. Pauses while the tab is hidden; with reduced motion it shows a
 * single still frame and the grid does not move.
 */
export function BackgroundField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const motion = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const start = performance.now();
    let palette = readPalette();
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;

    const draw = (time: number) => drawRouteField(ctx, width, height, time, palette);
    const reduced = () => motion?.matches === true;

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      if (now - last < FRAME_MS) return;
      last = now;
      draw((now - start) / 1000);
    };

    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const sync = () => {
      stop();
      if (reduced()) draw(STATIC_TIME);
      else if (!document.hidden) frame = window.requestAnimationFrame(tick);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced()) draw(STATIC_TIME);
    };

    // Re-read colours when the theme class on <html> changes.
    const themeObserver = new MutationObserver(() => {
      palette = readPalette();
      if (reduced()) draw(STATIC_TIME);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    resize();
    sync();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", sync);
    motion?.addEventListener?.("change", sync);

    return () => {
      stop();
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", sync);
      motion?.removeEventListener?.("change", sync);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="field-glow absolute inset-0" />
      <div className="field-grid absolute -inset-14" />
      <canvas ref={canvasRef} className="field-canvas absolute inset-0 h-full w-full" />
    </div>
  );
}
