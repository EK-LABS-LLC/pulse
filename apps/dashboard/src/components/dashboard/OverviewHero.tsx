import { useMemo, useState } from "react";
import type { OverviewSeries } from "../../lib/apiClient";
import { SegmentedControl } from "../ui/SegmentedControl";

export type OverviewMeasure = "requests" | "cost" | "latency" | "tokens";
export type OverviewSplit =
  "none" | "provider" | "source" | "service" | "model";

interface OverviewHeroProps {
  rangeLabel: string;
  measure: OverviewMeasure;
  splitBy: OverviewSplit;
  onMeasureChange: (value: OverviewMeasure) => void;
  onSplitChange: (value: OverviewSplit) => void;
  headline: string;
  deltaLabel?: string;
  successRateLabel: string;
  failedLabel: string;
  topFailing?: string | null;
  onInvestigate?: () => void;
  /** Series from extended API or derived provisional series from existing analytics. */
  series: OverviewSeries[];
  /** True when the extended endpoint is live. */
  extendedAvailable: boolean;
  latencyP50?: string;
  latencyP95?: string;
}

const MEASURE_OPTIONS: Array<{ value: OverviewMeasure; label: string }> = [
  { value: "requests", label: "Requests" },
  { value: "cost", label: "Cost" },
  { value: "latency", label: "Latency" },
  { value: "tokens", label: "Tokens" },
];

const SPLIT_OPTIONS: Array<{ value: OverviewSplit; label: string }> = [
  { value: "none", label: "None" },
  { value: "provider", label: "Provider" },
  { value: "source", label: "Source" },
  { value: "service", label: "Service" },
  { value: "model", label: "Model" },
];

function SeriesChart({ series }: { series: OverviewSeries[] }) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const visibleSeries = series.filter((item) => !hiddenSeries.has(item.id));
  const pointCount = Math.max(
    1,
    ...visibleSeries.map((item) => item.points.length),
  );
  const maxValue = Math.max(
    1,
    ...visibleSeries.flatMap((item) => item.points.map((point) => point.value)),
  );
  const chart = useMemo(() => {
    const left = 64;
    const right = 982;
    const top = 18;
    const bottom = 252;
    const width = right - left;
    const height = bottom - top;
    const x = (index: number) =>
      left + (pointCount === 1 ? width / 2 : (index / (pointCount - 1)) * width);
    const y = (value: number) => bottom - (value / maxValue) * height;

    return { left, right, top, bottom, width, height, x, y };
  }, [maxValue, pointCount]);

  if (series.length === 0 || series.every((s) => s.points.length === 0)) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line-soft bg-surface-3">
        <p className="text-sm text-dim">No series for this measure yet</p>
        <p className="text-[11.5px] text-faint">
          Extended overview analytics will fill this chart when available
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex min-h-8 flex-wrap items-center gap-2">
        {series.map((item) => {
          const total = item.points.reduce((sum, point) => sum + point.value, 0);
          const hidden = hiddenSeries.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setHiddenSeries((current) => {
                  const next = new Set(current);
                  if (next.has(item.id)) next.delete(item.id);
                  else if (next.size < series.length - 1) next.add(item.id);
                  return next;
                });
              }}
              className="flex cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-colors"
              style={{
                background: hidden ? "transparent" : "var(--fill)",
                borderColor: hidden ? "var(--border-soft)" : "var(--border-strong)",
                color: hidden ? "var(--faint)" : "var(--text-3)",
                opacity: hidden ? 0.65 : 1,
              }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
              <span>{item.name}</span>
              <span className="tabular-nums" style={{ color: "var(--dim)" }}>{total.toLocaleString()}</span>
            </button>
          );
        })}
        <span className="ml-auto text-xs text-faint">Click a series to compare</span>
      </div>

      <div className="relative" onMouseLeave={() => setHoverIndex(null)}>
        <svg
          viewBox="0 0 1000 300"
          className="block h-[300px] w-full overflow-visible"
          preserveAspectRatio="none"
          onMouseMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
            setHoverIndex(Math.round(ratio * (pointCount - 1)));
          }}
        >
          {Array.from({ length: 5 }, (_, index) => {
            const value = maxValue * (1 - index / 4);
            const lineY = chart.y(value);
            return (
              <g key={value}>
                <line x1={chart.left} x2={chart.right} y1={lineY} y2={lineY} stroke="var(--grid)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <text x={chart.left - 10} y={lineY + 4} textAnchor="end" fill="var(--dim)" fontSize="11.5">{Math.round(value).toLocaleString()}</text>
              </g>
            );
          })}

          {visibleSeries.map((item) => {
            const points = item.points.map((point, index) => `${chart.x(index)},${chart.y(point.value)}`);
            const linePath = points.length > 1 ? `M ${points.join(" L ")}` : "";
            const areaPath = points.length > 1 ? `${linePath} L ${chart.x(points.length - 1)},${chart.bottom} L ${chart.x(0)},${chart.bottom} Z` : "";
            return (
              <g key={item.id}>
                {areaPath ? <path d={areaPath} fill={item.color} opacity="0.08" /> : null}
                {linePath ? <path d={linePath} fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" /> : null}
              </g>
            );
          })}

          {hoverIndex !== null && (
            <line x1={chart.x(hoverIndex)} x2={chart.x(hoverIndex)} y1={chart.top} y2={chart.bottom} stroke="var(--crosshair)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        {hoverIndex !== null && (
          <div className="pointer-events-none absolute top-2 rounded-xl border px-3 py-2 shadow-xl" style={{ left: `${(chart.x(hoverIndex) / 10)}%`, transform: "translateX(-50%)", background: "var(--surface-4)", borderColor: "var(--border-strong)" }}>
            <div className="mb-1.5 text-[11.5px] text-dim">{visibleSeries[0]?.points[hoverIndex]?.period || "Selected period"}</div>
            <div className="flex flex-col gap-1">
              {visibleSeries.map((item) => {
                const point = item.points[hoverIndex];
                return point ? <div key={item.id} className="flex items-center gap-2 text-xs tabular-nums text-fg"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{point.value.toLocaleString()}<span className="text-dim">{item.name}</span></div> : null;
              })}
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 text-xs text-faint">Hover the chart for per-period figures</div>
    </div>
  );
}

export function OverviewHero({
  rangeLabel,
  measure,
  splitBy,
  onMeasureChange,
  onSplitChange,
  headline,
  deltaLabel,
  successRateLabel,
  failedLabel,
  topFailing,
  onInvestigate,
  series,
  extendedAvailable,
  latencyP50,
  latencyP95,
}: OverviewHeroProps) {
  return (
    <section className="rounded-2xl border border-line bg-surface px-6 pb-[18px] pt-6">
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="mb-2 text-[13px] text-dim">{rangeLabel}</div>
          <div className="flex items-baseline gap-3">
            <span className="text-[44px] font-semibold leading-none tracking-[-0.035em] tabular-nums text-fg">
              {headline}
            </span>
            {deltaLabel ? (
              <span className="text-[13px] text-dim">{deltaLabel}</span>
            ) : null}
          </div>
          {!extendedAvailable ? (
            <p className="mt-2 text-[11.5px] text-faint">
              Latency splits and histogram wait on{" "}
              <code className="font-mono">/analytics/overview-extended</code>
            </p>
          ) : null}
        </div>

        <div className="flex items-stretch">
          <div className="border-l border-line px-[22px]">
            <div className="mb-1.5 text-[12.5px] text-dim">Success rate</div>
            <div className="text-[22px] font-semibold tracking-[-0.02em] tabular-nums text-green">
              {successRateLabel}
            </div>
          </div>
          <div className="border-l border-line px-[22px]">
            <div className="mb-1.5 text-[12.5px] text-dim">Failed</div>
            <div className="text-[22px] font-semibold tracking-[-0.02em] tabular-nums text-red">
              {failedLabel}
            </div>
          </div>
          <div className="flex flex-col justify-between border-l border-line pl-[22px]">
            <div className="mb-1.5 text-[12.5px] text-dim">Most failures</div>
            <div className="flex items-center gap-2.5">
              <span className="rounded-lg bg-red-tint px-2 py-1 font-mono text-[12.5px] text-red">
                {topFailing || "—"}
              </span>
              {onInvestigate ? (
                <button
                  type="button"
                  onClick={onInvestigate}
                  className="cursor-pointer rounded-lg border-0 bg-track px-3 py-1.5 text-xs text-fg"
                >
                  Investigate
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3.5 flex flex-wrap items-center gap-5">
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-faint">Measure</span>
          <SegmentedControl
            ariaLabel="Overview measure"
            value={measure}
            onChange={onMeasureChange}
            options={MEASURE_OPTIONS}
          />
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-faint">Split by</span>
          <SegmentedControl
            ariaLabel="Overview split"
            value={splitBy}
            onChange={onSplitChange}
            options={SPLIT_OPTIONS}
          />
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11.5px] text-faint">
          <span>p50 {latencyP50 ?? "—"}</span>
          <span>p95 {latencyP95 ?? "—"}</span>
        </div>
      </div>

      <SeriesChart series={series} />
    </section>
  );
}
