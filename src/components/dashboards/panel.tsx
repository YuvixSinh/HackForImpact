/** A titled glass panel for dashboard areas. */
export function Panel({
  code,
  title,
  children,
  className,
}: {
  code: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass rounded-2xl border border-line p-5 ${className ?? ""}`}>
      <p aria-hidden="true" className="eyebrow mb-3 tabular-nums">
        {code}
      </p>
      <h2 className="mb-4 font-medium text-ink">{title}</h2>
      {children}
    </section>
  );
}
