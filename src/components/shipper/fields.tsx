/** Compact labelled inputs for dense data forms (shipment intake, settings). */
const control =
  "w-full rounded-lg border border-line bg-background/60 px-3 py-2 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-200 focus:border-brand focus:ring-4 focus:ring-brand/15 aria-[invalid=true]:border-red-500";

type Base = { name: string; label: string; error?: string; defaultValue?: string; className?: string };

function Wrapper({ name, label, error, className, children }: Base & { children: React.ReactNode }) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <label htmlFor={name} className="eyebrow block">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Field(props: Base & { type?: string; step?: string; min?: string; placeholder?: string }) {
  const { name, error, defaultValue, type = "text", step, min, placeholder } = props;
  return (
    <Wrapper {...props}>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        min={min}
        placeholder={placeholder}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`${control} ${type === "number" ? "tabular-nums" : ""}`}
      />
    </Wrapper>
  );
}

export function Select(props: Base & { options: readonly { value: string; label: string }[] }) {
  const { name, error, defaultValue, options } = props;
  return (
    <Wrapper {...props}>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={control}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

export function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[var(--brand)]" />
      {label}
    </label>
  );
}
