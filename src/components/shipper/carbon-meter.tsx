import type { CarbonPeriodSummary, CarbonSummary } from "@/lib/sustainability/summary";

const kg = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

function Period({ label, period }: { label: string; period: CarbonPeriodSummary }) {
  const actualShare = period.baselineKg > 0 ? (period.co2Kg / period.baselineKg) * 100 : 0;
  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="eyebrow">{label}</h3>
        <span className="text-xs text-ink-muted tabular-nums">
          {period.bookings} {period.bookings === 1 ? "booking" : "bookings"}
        </span>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold text-ink tabular-nums">{kg.format(period.savedKg)} kg</p>
          <p className="text-xs text-ink-muted">CO₂ saved</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-brand tabular-nums" aria-label={`Sustainability score ${period.score} out of 100`}>
            {period.score}
          </p>
          <p className="text-xs text-ink-muted">score / 100</p>
        </div>
      </div>
      <div className="space-y-1">
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full bg-accent-sage" style={{ width: `${actualShare}%` }} />
        </div>
        <dl className="flex justify-between text-xs text-ink-muted tabular-nums">
          <div>
            <dt className="inline">Actual </dt>
            <dd className="inline font-medium text-ink">{kg.format(period.co2Kg)} kg</dd>
          </div>
          <div>
            <dt className="inline">Dedicated-vehicle baseline </dt>
            <dd className="inline font-medium text-ink">{kg.format(period.baselineKg)} kg</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/** Presentational carbon summary for confirmed and delivered bookings (UTC calendar periods). */
export function CarbonMeter({ summary }: { summary: CarbonSummary }) {
  const year = new Date(summary.yearStart).getUTCFullYear();
  return (
    <section aria-labelledby="carbon-meter-heading" className="glass space-y-4 rounded-2xl border border-line p-5">
      <div>
        <h2 id="carbon-meter-heading" className="font-medium text-ink">
          Carbon meter
        </h2>
        <p className="text-xs text-ink-muted">Confirmed and delivered bookings, compared with sending each in a dedicated vehicle.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Period label={`This month · ${monthLabel.format(new Date(summary.monthStart))}`} period={summary.month} />
        <Period label={`This year · ${year}`} period={summary.year} />
      </div>
    </section>
  );
}
