"use client";

import { useActionState } from "react";
import { savePolicyAction } from "@/app/actions/shipments";
import type { ApprovalThresholds } from "@/lib/domain/policy";
import { Field } from "./fields";

/** Account-editable approval thresholds (shipper accounts only; enforced on the server). */
export function PolicyForm({ thresholds }: { thresholds: ApprovalThresholds }) {
  const [state, action, pending] = useActionState(savePolicyAction, undefined);
  const errors = state?.errors ?? {};
  return (
    <form action={action} noValidate className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Field name="maxAutoPrice" label="Auto-book up to £" type="number" min="0" step="any" defaultValue={String(thresholds.maxAutoPricePence / 100)} error={errors.maxAutoPrice} />
        <Field name="declaredValueThreshold" label="Ask above value £" type="number" min="0" step="any" defaultValue={String(thresholds.declaredValueThresholdPence / 100)} error={errors.declaredValueThreshold} />
        <Field name="minDeadlineMarginHours" label="Min. spare hours" type="number" min="0" step="any" defaultValue={String(thresholds.minDeadlineMarginHours)} error={errors.minDeadlineMarginHours} />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-full border border-line px-4 py-1.5 text-sm transition-colors hover:border-brand disabled:opacity-60">
          {pending ? "Saving…" : "Save thresholds"}
        </button>
        {state?.message ? (
          <p role="status" className="text-sm text-ink-muted">
            {state.message}
          </p>
        ) : null}
      </div>
      <p className="font-mono text-[11px] text-ink-muted">Critical shipments, dangerous goods, and no-match results always ask first.</p>
    </form>
  );
}
