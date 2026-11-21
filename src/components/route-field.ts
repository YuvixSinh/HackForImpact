/**
 * Pure canvas drawing for the decorative background: freight hubs joined by faint
 * road/sea/air arcs, with small "packets" travelling along each route.
 * Positions are fractions of the viewport so the field scales to any screen.
 */

export type FieldPalette = { line: string; node: string; label: string; road: string; sea: string; air: string };

type Mode = "road" | "sea" | "air";
type Point = { x: number; y: number };

const NODES: (Point & { label: string })[] = [
  { x: 0.07, y: 0.2, label: "51.51N 00.13W" },
  { x: 0.24, y: 0.08, label: "53.48N 02.24W" },
  { x: 0.16, y: 0.62, label: "50.37N 04.14W" },
  { x: 0.38, y: 0.86, label: "48.86N 02.35E" },
  { x: 0.62, y: 0.94, label: "45.46N 09.19E" },
  { x: 0.8, y: 0.68, label: "51.92N 04.48E" },
  { x: 0.93, y: 0.3, label: "53.55N 09.99E" },
  { x: 0.72, y: 0.12, label: "55.68N 12.57E" },
  { x: 0.5, y: 0.4, label: "52.37N 04.90E" },
];

// [from, to, mode, bend] — bend offsets the arc's control point, as a fraction of its length.
const ROUTES: [number, number, Mode, number][] = [
  [0, 1, "road", 0.18],
  [0, 2, "road", -0.2],
  [2, 3, "sea", 0.22],
  [3, 4, "road", -0.15],
  [4, 5, "sea", 0.25],
  [5, 6, "sea", -0.2],
  [6, 7, "road", 0.2],
  [1, 7, "air", -0.12],
  [0, 8, "air", 0.16],
  [8, 5, "road", -0.18],
  [2, 8, "sea", 0.12],
];

const MONO = '10px ui-monospace, "Cascadia Mono", "Segoe UI Mono", Menlo, Consolas, monospace';

function quad(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

function controlPoint(a: Point, b: Point, bend: number): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return { x: (a.x + b.x) / 2 - dy * bend, y: (a.y + b.y) / 2 + dx * bend };
}

function nodePositions(width: number, height: number, time: number): Point[] {
  // The whole field floats slowly; each hub also bobs on its own phase.
  const driftX = Math.sin(time * 0.05) * 14;
  const driftY = Math.cos(time * 0.04) * 10;
  return NODES.map((n, i) => ({
    x: n.x * width + driftX + Math.sin(time * 0.21 + i * 1.7) * 4,
    y: n.y * height + driftY + Math.cos(time * 0.17 + i * 2.3) * 4,
  }));
}

function drawPacket(ctx: CanvasRenderingContext2D, a: Point, c: Point, b: Point, t: number, color: string) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const p = quad(a, c, b, Math.max(0, t - 0.09 + (0.09 * i) / 10));
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  const head = quad(a, c, b, t);
  ctx.globalAlpha = 0.14;
  ctx.beginPath();
  ctx.arc(head.x, head.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(head.x, head.y, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

export function drawRouteField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  palette: FieldPalette,
) {
  ctx.clearRect(0, 0, width, height);
  const nodes = nodePositions(width, height, time);
  const modeColor = { road: palette.road, sea: palette.sea, air: palette.air };

  ROUTES.forEach(([from, to, mode, bend], i) => {
    const a = nodes[from];
    const b = nodes[to];
    const c = controlPoint(a, b, bend);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 1;
    ctx.setLineDash(mode === "air" ? [2, 6] : []);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const speed = mode === "air" ? 0.07 : mode === "road" ? 0.045 : 0.03;
    const t = (time * speed + i * 0.37) % 1;
    drawPacket(ctx, a, c, b, t, modeColor[mode]);
  });

  const showLabels = width >= 768;
  ctx.font = MONO;
  nodes.forEach((p, i) => {
    const pulse = (time * 0.35 + i * 0.29) % 1;
    ctx.strokeStyle = palette.node;
    ctx.globalAlpha = 0.45 * (1 - pulse);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 + pulse * 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = palette.node;
    ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    if (showLabels) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.label;
      ctx.fillText(NODES[i].label, p.x + 9, p.y + 3);
    }
  });
  ctx.globalAlpha = 1;
}
