"use client";

import { useEffect, useState } from "react";
import type { WorkflowStep } from "@/lib/autopilot/workflow";
import type { Id } from "@/lib/domain/common";
import { formatPence } from "./format";
import type { OptionView } from "./types";

const STEP_MS = 750;

const TONE_DOT: Record<WorkflowStep["tone"], string> = {
  done: "bg-brand text-brand-ink",
  attention: "bg-accent-amber text-black",
  blocked: "bg-accent-bronze text-white",
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type Props = {
  steps: WorkflowStep[];
  options: OptionView[];
  chosenOptionId: Id | null;
};

/**
 * Animated replay of one Autopilot run: the options it found appear first, then each decision
 * step "works" and completes in turn, and the chosen option is highlighted once ranking is done.
 * Reduced-motion users see the finished state immediately. Replay remounts the player.
 */
export function AgentWorkflow(props: Props) {
  const [run, setRun] = useState(0);
  return (
    <WorkflowPlayer
      key={run}
      {...props}
      onReplay={() => setRun((r) => r + 1)}
    />
  );
}

function WorkflowPlayer({
  steps,
  options,
  chosenOptionId,
  onReplay,
}: Props & { onReplay: () => void }) {
  const last = steps.length * 2;
  const [tick, setTick] = useState(0);
  const run = 0;

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const timer = window.setInterval(
      () => setTick((t) => (reduced ? last : Math.min(t + 1, last))),
      reduced ? 0 : STEP_MS,
    );
    return () => window.clearInterval(timer);
  }, [last]);

  const decided = tick >= 4;
  const finished = tick >= last;

  return (
    <section
      aria-labelledby="agent-heading"
      className="glass space-y-5 rounded-xl border border-line p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p id="agent-heading" className="eyebrow">
            Autopilot at work
          </p>
          <p className="mt-1 text-sm text-ink-muted" aria-live="polite">
            {finished
              ? "Done. Here is what the agent decided and why."
              : "Comparing the options and deciding…"}
          </p>
        </div>
        <button
          type="button"
          onClick={onReplay}
          className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-muted"
        >
          Replay
        </button>
      </div>

      <div>
        <p className="eyebrow mb-2">1 · Options available</p>
        <ol className="space-y-2">
          {options.map((o, i) => {
            const chosen = o.id === chosenOptionId;
            return (
              <li
                key={`${o.id}-${run}`}
                style={{ animationDelay: `${i * 120}ms` }}
                className={[
                  "rise-in flex items-center justify-between gap-3 rounded-lg border px-3 py-2 font-mono text-sm tabular-nums transition-all duration-500",
                  decided && chosen
                    ? "border-brand bg-brand/10 ring-2 ring-brand"
                    : "border-line",
                  decided && !chosen ? "opacity-45" : "",
                ].join(" ")}
              >
                <span className="text-ink">
                  #{o.rank}{" "}
                  {o.mode
                    ? o.mode[0].toUpperCase() + o.mode.slice(1)
                    : "Option"}
                </span>
                <span className="hidden text-ink-muted sm:inline">
                  {Math.round(o.deadlineMarginHours)} h spare · {o.co2Kg} kg CO₂
                </span>
                <span className="flex items-center gap-2 text-ink">
                  {decided && chosen && (
                    <span className="rise-in rounded-full bg-brand px-2 py-0.5 font-sans text-xs text-brand-ink">
                      Agent&apos;s pick
                    </span>
                  )}
                  {formatPence(o.totalPricePence)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div>
        <p className="eyebrow mb-2">2 · What the agent did</p>
        <ol className="relative space-y-3 border-l border-line pl-5">
          {steps.map((s, i) => {
            const state =
              tick >= 2 + 2 * i
                ? "done"
                : tick === 1 + 2 * i
                  ? "working"
                  : "waiting";
            if (state === "waiting") return null;
            return (
              <li key={`${s.key}-${run}`} className="rise-in relative">
                <span
                  aria-hidden="true"
                  className={`absolute -left-[29px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${state === "done" ? TONE_DOT[s.tone] : "bg-surface-muted"}`}
                >
                  {state === "working" ? (
                    <span className="h-2 w-2 animate-ping rounded-full bg-brand" />
                  ) : s.tone === "done" ? (
                    "✓"
                  ) : (
                    "!"
                  )}
                </span>
                <p className="text-sm font-medium text-ink">{s.title}</p>
                <p className="text-sm text-ink-muted">
                  {state === "working" ? "Working…" : s.detail}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
