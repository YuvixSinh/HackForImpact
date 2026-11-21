/**
 * Minimal simulated "map": a line from origin to destination with a marker at `progress` (0–1).
 * Pair with `simulatePosition` from `@/lib/tracking/simulate`. The marker glides between
 * positions only when the user has not asked for reduced motion.
 */
export function RouteProgress({
  origin,
  destination,
  progress,
  label,
  disrupted = false,
}: {
  origin: string;
  destination: string;
  progress: number;
  label: string;
  disrupted?: boolean;
}) {
  const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const x1 = 24;
  const x2 = 296;
  const x = x1 + (x2 - x1) * p;
  return (
    <figure className="rounded-lg border border-line bg-surface p-3">
      <svg viewBox="0 0 320 64" className="w-full" role="img" aria-label={`${origin} to ${destination}: ${label}`}>
        <path d={`M${x1} 40 Q160 4 ${x2} 40`} fill="none" className="stroke-line" strokeWidth="3" strokeDasharray="6 6" />
        <line x1={x1} y1={40} x2={x} y2={40} className={disrupted ? "stroke-accent-bronze" : "stroke-brand"} strokeWidth="3" strokeLinecap="round" />
        <circle cx={x1} cy={40} r={5} className="fill-ink-muted" />
        <circle cx={x2} cy={40} r={5} className="fill-ink-muted" />
        <g
          className="motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out"
          style={{ transform: `translateX(${x - x1}px)` }}
        >
          <circle cx={x1} cy={40} r={8} className={disrupted ? "fill-accent-bronze" : "fill-brand"} />
          <circle cx={x1} cy={40} r={3} className="fill-surface" />
        </g>
      </svg>
      <figcaption className="mt-1 flex justify-between gap-2 text-xs text-ink-muted">
        <span>{origin}</span>
        <span className="font-medium text-ink">{label}</span>
        <span>{destination}</span>
      </figcaption>
    </figure>
  );
}
