import { REASON_LABELS } from "@/lib/policy/evaluate";
import { formatPence, MODE_LABEL } from "./format";
import type { ApprovalView, FormAction, OptionView } from "./types";

const primary = "rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink hover:opacity-90";
const secondary = "rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-muted";

function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}

/**
 * A pending approval: why Autopilot stopped, and the choices. Each button posts ids only;
 * the server re-checks the approval and books.
 */
export function ApprovalCard({
  approval,
  options,
  shipmentId,
  approveAction,
  declineAction,
}: {
  approval: ApprovalView;
  options: OptionView[];
  shipmentId: string;
  approveAction: FormAction;
  declineAction: FormAction;
}) {
  const recommended = options.find((o) => o.id === approval.recommendedOptionId) ?? null;
  const alternatives = options.filter((o) => o.id !== recommended?.id);
  const describe = (o: OptionView) =>
    `${o.mode ? MODE_LABEL[o.mode] : "Option"} #${o.rank} · ${formatPence(o.totalPricePence)}`;

  return (
    <section aria-labelledby="approval-heading" className="glass rounded-xl border border-accent-amber p-5">
      <p className="eyebrow">Needs your approval</p>
      <h2 id="approval-heading" className="mt-1 text-lg font-semibold text-ink">
        Autopilot paused before booking
      </h2>
      <ul aria-label="Approval reasons" className="mt-3 space-y-1 text-sm text-ink">
        {approval.reasons.map((r) => (
          <li key={r} className="flex gap-2">
            <span aria-hidden className="text-accent-amber">
              ●
            </span>
            {REASON_LABELS[r]}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {recommended && (
          <form action={approveAction}>
            <Hidden name="approvalId" value={approval.id} />
            <Hidden name="shipmentId" value={shipmentId} />
            <Hidden name="selectedOptionId" value={recommended.id} />
            <button type="submit" className={`${primary} w-full sm:w-auto`}>
              Approve recommended
            </button>
          </form>
        )}
        {alternatives.map((alt) => (
          <form key={alt.id} action={approveAction}>
            <Hidden name="approvalId" value={approval.id} />
            <Hidden name="shipmentId" value={shipmentId} />
            <Hidden name="selectedOptionId" value={alt.id} />
            <button type="submit" className={`${secondary} w-full sm:w-auto`}>
              Choose this alternative <span className="font-mono tabular-nums">({describe(alt)})</span>
            </button>
          </form>
        ))}
        <form action={declineAction}>
          <Hidden name="approvalId" value={approval.id} />
          <Hidden name="shipmentId" value={shipmentId} />
          <button type="submit" className={`${secondary} w-full text-accent-bronze sm:w-auto`}>
            Decline
          </button>
        </form>
      </div>
    </section>
  );
}
