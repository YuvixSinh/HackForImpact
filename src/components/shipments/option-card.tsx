import type { ReactNode } from "react";
import { formatDateTime, formatKg, formatMargin, formatPence, MODE_LABEL } from "./format";
import type { OptionView } from "./types";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm tabular-nums text-ink">{children}</dd>
    </div>
  );
}

/** One ranked option with the fields that decide between options. */
export function OptionCard({
  option,
  recommended = false,
  action,
}: {
  option: OptionView;
  recommended?: boolean;
  action?: ReactNode;
}) {
  return (
    <li
      aria-label={`Option ${option.rank}`}
      className={`glass rounded-xl border p-4 ${recommended ? "border-brand" : "border-line"}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-ink">
          <span className="font-mono tabular-nums text-ink-muted">#{option.rank}</span>{" "}
          {option.mode ? MODE_LABEL[option.mode] : "Transport"}
          {recommended && (
            <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs text-brand-ink">Recommended</span>
          )}
        </p>
        <p className="font-mono text-lg tabular-nums text-ink">{formatPence(option.totalPricePence)}</p>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Departs → arrives">
          {option.departureAt ? formatDateTime(option.departureAt) : "—"} → {formatDateTime(option.arrivalAt)}
        </Field>
        <Field label="Deadline margin">
          <span className={option.deadlineMarginHours < 0 ? "text-accent-bronze" : undefined}>
            {formatMargin(option.deadlineMarginHours)}
          </span>
        </Field>
        <Field label="Capacity fit">{option.capacityFit ?? "—"}</Field>
        <Field label="CO₂">{formatKg(option.co2Kg)}</Field>
        <Field label="CO₂ saved">
          <span className="text-accent-sage">{option.co2SavedKg === null ? "—" : formatKg(option.co2SavedKg)}</span>
        </Field>
      </dl>
      {option.compromises.length > 0 && (
        <ul aria-label="Compromises" className="mt-3 space-y-1 text-sm text-accent-amber">
          {option.compromises.map((c) => (
            <li key={c}>• {c}</li>
          ))}
        </ul>
      )}
      {action && <div className="mt-4">{action}</div>}
    </li>
  );
}

/** Ranked options (up to three). `renderAction` adds e.g. a manual "Book this option" form. */
export function OptionsList({
  options,
  recommendedId,
  renderAction,
}: {
  options: OptionView[];
  recommendedId?: string | null;
  renderAction?: (option: OptionView) => ReactNode;
}) {
  if (options.length === 0) return <p className="text-sm text-ink-muted">No options to compare yet.</p>;
  return (
    <ol className="space-y-3">
      {options.map((o) => (
        <OptionCard key={o.id} option={o} recommended={o.id === recommendedId} action={renderAction?.(o)} />
      ))}
    </ol>
  );
}
