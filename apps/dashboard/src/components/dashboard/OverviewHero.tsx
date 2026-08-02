import { sparkPath } from "../../lib/format";
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {series.map((item) => {
        const values = item.points.map((p) => p.value);
        const path = sparkPath(values);
        const total = values.reduce((sum, value) => sum + value, 0);
        return (
          <div
            key={item.id}
            className="rounded-xl border border-line bg-surface-3 p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: item.color }}
                />
                <span className="truncate text-xs text-fg-3">{item.name}</span>
              </div>
              <span className="text-xs tabular-nums text-dim">
                {total.toLocaleString()}
              </span>
            </div>
            <svg
              viewBox="0 0 64 22"
              className="h-12 w-full overflow-visible"
              preserveAspectRatio="none"
            >
              {path ? (
                <polyline
                  points={path}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
            </svg>
          </div>
        );
      })}
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
