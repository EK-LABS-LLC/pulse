import { sparkPath, tint } from "../../lib/format";

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?:
    | "emerald"
    | "blue"
    | "purple"
    | "amber"
    | "rose"
    | "cyan"
    | "indigo"
    | "violet";
  change?: {
    value: string;
    positive: boolean;
  };
  subtitle?: string;
  /** Real measurements only — a sparkline with no series simply renders none. */
  series?: number[];
}

const accents: Record<string, string> = {
  emerald: "var(--green)",
  blue: "var(--blue)",
  purple: "var(--purple)",
  amber: "var(--orange)",
  rose: "var(--red)",
  cyan: "var(--teal)",
  indigo: "var(--blue)",
  violet: "var(--purple)",
};

export function StatCard({
  label,
  value,
  icon,
  color,
  change,
  subtitle,
  series,
}: StatCardProps) {
  const accent = color ? accents[color] : "var(--neutral)";
  const points = series && series.length > 1 ? sparkPath(series) : null;

  return (
    <div
      className="flex flex-col gap-3 rounded-xl p-4"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-soft)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ background: tint(accent, 0.14), color: accent }}
          >
            {icon}
          </span>
          <span
            className="truncate text-xs tracking-wide uppercase"
            style={{ color: "var(--dim)" }}
          >
            {label}
          </span>
        </div>
        {change && (
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium"
            style={{
              color: change.positive ? "var(--green)" : "var(--red)",
              background: tint(
                change.positive ? "var(--green)" : "var(--red)",
                0.14,
              ),
            }}
          >
            {change.positive ? "+" : ""}
            {change.value}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <span
          className="text-2xl leading-none font-semibold tabular-nums"
          style={{ color: "var(--text)" }}
        >
          {value}
        </span>
        {points && (
          <svg
            width="64"
            height="22"
            viewBox="0 0 64 22"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <polyline
              points={points}
              fill="none"
              stroke={accent}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {subtitle && (
        <span className="text-xs" style={{ color: "var(--dim)" }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}
