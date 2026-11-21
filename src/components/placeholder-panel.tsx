type PlaceholderPanelProps = {
  title: string;
  description: string;
};

/** Marks a dashboard area that a later task will implement. Holds no data. */
export function PlaceholderPanel({ title, description }: PlaceholderPanelProps) {
  return (
    <section className="rounded-2xl border border-dashed border-line bg-surface p-5">
      <h2 className="font-medium text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-muted">{description}</p>
    </section>
  );
}
