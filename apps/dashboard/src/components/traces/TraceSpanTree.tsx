import type { Span } from "../../lib/apiClient";
import { buildSpanRows } from "../../lib/spanRows";
import { fmtLatency } from "../../lib/format";

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
  const orderedSpans = [...spans].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const originMs = new Date(orderedSpans[0]?.timestamp ?? 0).getTime();
  const endMs = Math.max(
    originMs,
    ...orderedSpans.map(
      (span) =>
        new Date(span.timestamp).getTime() + Math.max(span.durationMs ?? 0, 0),
    ),
  );
  const totalMs = Math.max(endMs - originMs, 1);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => ({
    fraction,
    label: fmtLatency(totalMs * fraction),
  }));

  if (rows.length === 0) {
    return (
      <p className="px-1 py-6 text-sm" style={{ color: "var(--dim)" }}>
        No spans recorded for this trace.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="mb-1.5 grid grid-cols-[220px_minmax(0,1fr)] gap-3 px-2">
          <div />
          <div className="relative h-4">
            {ticks.map((tick) => (
              <span
                key={tick.fraction}
                className="absolute top-0 text-[10px] whitespace-nowrap tabular-nums text-dim"
                style={{
                  left: `${tick.fraction * 100}%`,
                  transform:
                    tick.fraction === 0
                      ? "none"
                      : tick.fraction === 1
                        ? "translateX(-100%)"
                        : "translateX(-50%)",
                }}
              >
                {tick.label}
              </span>
            ))}
          </div>
        </div>

        {rows.map((row) => {
          const active = row.id === activeSpanId;
          const durationStyle =
            row.durationPlacement === "after"
              ? { left: row.labelLeftPct }
              : row.durationPlacement === "before"
                ? { right: row.labelRightPct }
                : { right: "6px" };

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
              className={`grid grid-cols-[220px_minmax(0,1fr)] items-center gap-3 rounded-lg px-2 py-[7px] transition-colors ${
                onSelect ? "cursor-pointer hover:bg-hover" : ""
              }`}
              style={{
                background: active ? "var(--blue-tint)" : "transparent",
              }}
            >
              <div
                className="flex min-w-0 items-center gap-1.5"
                style={{ paddingLeft: row.indentPx }}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: row.color }}
                />
                <span
                  className="min-w-0 truncate text-xs"
                  style={{ color: row.labelColor }}
                  title={row.label}
                >
                  {row.label}
                </span>
                <span
                  className="ml-auto max-w-[82px] shrink-0 truncate font-mono text-[10.5px] text-faint"
                  title={row.service}
                >
                  {row.service ?? "—"}
                </span>
              </div>

              <div className="relative h-5 overflow-hidden rounded-md">
                <div
                  className="absolute top-0.5 h-4 min-w-[3px] rounded-md"
                  style={{
                    left: row.leftPct,
                    width: row.widthPct,
                    background: row.color,
                  }}
                />
                <span
                  className="absolute top-1/2 max-w-[72px] -translate-y-1/2 overflow-hidden text-[11px] whitespace-nowrap text-ellipsis tabular-nums"
                  style={{
                    ...durationStyle,
                    color:
                      row.durationPlacement === "inside"
                        ? "var(--text)"
                        : "var(--dim)",
                  }}
                >
                  {row.durationLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
