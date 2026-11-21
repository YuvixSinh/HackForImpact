import { formatPence, MODE_LABEL } from "./format";
import type { OptionView } from "./types";

/** Autopilot's recommendation and its plain-language reasoning. */
export function RecommendationPanel({
  isExactMatch,
  explanation,
  recommended,
}: {
  isExactMatch: boolean;
  explanation: string;
  recommended: OptionView | null;
}) {
  return (
    <section aria-labelledby="recommendation-heading" className="glass rise-in rounded-xl border border-line p-5">
      <p className="eyebrow">Autopilot</p>
      <h2 id="recommendation-heading" className="mt-1 text-lg font-semibold text-ink">
        {isExactMatch ? "Recommendation" : "No exact match"}
      </h2>
      {!isExactMatch && (
        <p className="mt-2 text-sm text-accent-amber">
          Your request is not fulfilled as entered. The closest alternatives below each differ from it, and none
          will be booked without your approval.
        </p>
      )}
      {recommended && isExactMatch && (
        <p className="mt-2 font-mono text-sm tabular-nums text-ink">
          {recommended.mode ? MODE_LABEL[recommended.mode] : "Transport"} · {formatPence(recommended.totalPricePence)}
        </p>
      )}
      <p className="mt-2 text-sm leading-6 text-ink-muted">{explanation}</p>
    </section>
  );
}
