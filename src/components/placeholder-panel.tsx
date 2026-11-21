type PlaceholderPanelProps = {
  title: string;
  description: string;
  index?: number;
};

/** Marks a dashboard area that a later task will implement. Holds no data. */
export function PlaceholderPanel({ title, description, index = 0 }: PlaceholderPanelProps) {
  return (
    <section className="glass rounded-2xl border border-line p-5 hover:border-ink-muted/40">
      <div aria-hidden="true" className="eyebrow mb-5 flex items-center justify-between">
        <span className="tabular-nums">P-{String(index + 1).padStart(2, "0")}</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-amber" />
          Planned
        </span>
      </div>
      <h2 className="font-medium text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-muted">{description}</p>
      <div aria-hidden="true" className="mt-5 border-t border-dashed border-line" />
    </section>
  );
}
