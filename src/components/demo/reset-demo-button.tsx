"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type State = { kind: "idle" } | { kind: "working" } | { kind: "done"; message: string } | { kind: "error"; message: string };

/** Resets the in-memory demo data via POST /api/demo/reset, then refreshes the current page. */
export function ResetDemoButton({ className }: { className?: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });

  async function reset() {
    setState({ kind: "working" });
    try {
      const response = await fetch("/api/demo/reset", { method: "POST" });
      if (!response.ok) throw new Error(response.status === 404 ? "Demo reset is turned off here." : "Reset failed.");
      const body = (await response.json()) as { scenarios?: { asExpected: boolean }[] };
      const total = body.scenarios?.length ?? 0;
      const good = body.scenarios?.filter((s) => s.asExpected).length ?? 0;
      setState({ kind: "done", message: `Demo data reset (${good}/${total} scenarios as scripted). Sign in again to continue.` });
      router.refresh();
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "Reset failed." });
    }
  }

  return (
    <div className={className}>
      <button type="button" onClick={reset} disabled={state.kind === "working"}>
        {state.kind === "working" ? "Resetting..." : "Reset demo data"}
      </button>
      <p role="status" aria-live="polite">
        {state.kind === "done" || state.kind === "error" ? state.message : null}
      </p>
    </div>
  );
}
