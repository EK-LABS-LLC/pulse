import { sparkPath, tint } from "../../lib/format";

interface StatCardProps {
  label: string;
  value: string;
  accent?: string;
  series?: number[];
  delta?: { label: string; good: boolean } | null;
}

export function StatCard({
  label,
  value,
  accent = "var(--blue)",
  series,
  delta,
}: StatCardProps) {
  const points = series && series.length > 1 ? sparkPath(series) : null;
  const deltaColor = delta?.good ? "var(--green)" : "var(--red)";

  return (
    <div
      className="flex flex-col gap-3 rounded-xl p-4"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-soft)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-xs font-medium tracking-wide"
          style={{ color: "var(--dim)" }}
        >
          {label}
        </span>
        {delta && (
          <span
            className="rounded px-1.5 py-0.5 text-[11px] font-medium"
            style={{ color: deltaColor, background: tint(deltaColor, 0.14) }}
          >
            {delta.label}
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
    </div>
  );
}
