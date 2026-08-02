import type { Span } from "../../lib/apiClient";
import { buildSpanRows } from "../../lib/spanRows";

interface TraceSpanTreeProps {
  spans: Span[];
  activeSpanId?: string | null;
  onSelect?: (spanId: string) => void;
}

/**
 * Waterfall view of a trace's spans: bar position and width are the span's
 * share of the whole trace, so gaps and long poles are visible at a glance.
 */
export default function TraceSpanTree({
  spans,
  activeSpanId,
  onSelect,
}: TraceSpanTreeProps) {
  const rows = buildSpanRows(spans);

  if (rows.length === 0) {
    return (
      <p className="px-1 py-6 text-sm" style={{ color: "var(--dim)" }}>
        No spans recorded for this trace.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {rows.map((row) => {
        const active = row.id === activeSpanId;
        return (
          <div
            key={row.id}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onClick={onSelect ? () => onSelect(row.id) : undefined}
            onKeyDown={
              onSelect
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(row.id);
                    }
                  }
                : undefined
            }
            className={`grid grid-cols-[minmax(140px,260px)_1fr] items-center gap-3 rounded-md px-2 py-1.5 ${
              onSelect ? "cursor-pointer" : ""
            }`}
            style={{ background: active ? "var(--blue-tint)" : "transparent" }}
          >
            <div
              className="flex min-w-0 items-center gap-2"
              style={{ paddingLeft: row.indentPx }}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: row.color }}
              />
              <span
                className="truncate text-xs"
                style={{ color: row.labelColor }}
                title={row.label}
              >
                {row.label}
              </span>
            </div>

            <div className="relative h-5">
              <div
                className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
                style={{
                  left: row.leftPct,
                  width: row.widthPct,
                  background: row.color,
                }}
              />
              <span
                className="absolute top-1/2 -translate-y-1/2 text-[11px] whitespace-nowrap tabular-nums"
                style={{ left: row.labelLeftPct, color: "var(--faint)" }}
              >
                {row.durationLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
