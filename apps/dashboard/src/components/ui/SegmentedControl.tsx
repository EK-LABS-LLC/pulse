export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-lg p-0.5"
      style={{ background: "var(--fill)" }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className="cursor-pointer rounded-md border-0 px-2.5 py-1 text-xs font-medium transition-colors"
            style={{
              background: active ? "var(--seg-active)" : "transparent",
              color: active ? "var(--text)" : "var(--dim)",
              boxShadow: active ? "0 1px 2px var(--shadow-c)" : undefined,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
