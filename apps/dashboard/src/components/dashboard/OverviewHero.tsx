import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OverviewSeries } from "../../lib/apiClient";
import {
  formatOverviewPeriodLabel,
  normalizeOverviewSeries,
} from "../../lib/overviewChart";
import { DatePicker, type CalendarDateRange } from "../ui/DatePicker";
import { SegmentedControl } from "../ui/SegmentedControl";

export type OverviewMeasure = "requests" | "cost" | "latency" | "tokens";
export type OverviewSplit =
  "none" | "provider" | "source" | "service" | "model";
export type OverviewGranularity = "15m" | "hour" | "day";

interface OverviewHeroProps {
  rangeLabel: string;
  measure: OverviewMeasure;
  splitBy: OverviewSplit;
  granularity: OverviewGranularity;
  dateRange: CalendarDateRange;
  dateFrom: string;
  dateTo: string;
  onMeasureChange: (value: OverviewMeasure) => void;
  onSplitChange: (value: OverviewSplit) => void;
  onGranularityChange: (value: OverviewGranularity) => void;
  onDateRangeChange: (value: CalendarDateRange) => void;
  headline: string;
  deltaLabel?: string;
  successRateLabel: string;
  failedLabel: string;
  topFailing?: string | null;
  /** Series from extended API or derived provisional series from existing analytics. */
  series: OverviewSeries[];
  /** True when the extended endpoint is live. */
  extendedAvailable: boolean;
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

const GRANULARITY_OPTIONS: Array<{
  value: OverviewGranularity;
  label: string;
}> = [
  { value: "15m", label: "15 min" },
  { value: "hour", label: "Hourly" },
  { value: "day", label: "Daily" },
];

function formatDateWindow(dateFrom: string, dateTo: string): string {
  const format = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  return `${format(dateFrom)} – ${format(dateTo)}`;
}

function formatMeasureValue(value: number, measure: OverviewMeasure): string {
  if (measure === "cost") {
    return value < 1 ? `$${value.toFixed(2)}` : `$${value.toFixed(1)}`;
  }
  if (measure === "latency") {
    return value >= 1000
      ? `${(value / 1000).toFixed(1)}s`
      : `${Math.round(value)}ms`;
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString();
}

function OverviewTooltip({
  active,
  label,
  payload,
  measure,
  granularity,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{
    color?: string;
    name?: string;
    value?: number | string | null;
  }>;
  measure: OverviewMeasure;
  granularity: OverviewGranularity;
}) {
  if (!active || !payload?.length || !label) return null;

  return (
    <div className="rounded-xl border border-line-strong bg-surface-4 px-3 py-2 shadow-xl">
      <div className="mb-1.5 text-[11.5px] text-dim">
        {formatOverviewPeriodLabel(label, granularity, "tooltip")}
      </div>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center gap-2 text-xs tabular-nums text-fg"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: entry.color }}
            />
            {entry.value == null
              ? "—"
              : formatMeasureValue(Number(entry.value), measure)}
            <span className="text-dim">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeriesChart({
  series,
  measure,
  granularity,
}: {
  series: OverviewSeries[];
  measure: OverviewMeasure;
  granularity: OverviewGranularity;
}) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const normalized = useMemo(
    () => normalizeOverviewSeries(series, measure === "latency" ? null : 0),
    [measure, series],
  );
  const visibleSeries = normalized.series.filter(
    (item) => !hiddenSeries.has(item.id),
  );
  const chartData = useMemo(
    () =>
      normalized.periods.map((period, periodIndex) => {
        const row: Record<string, string | number | null> = { period };
        normalized.series.forEach((item) => {
          row[item.id] = item.points[periodIndex]?.value ?? null;
        });
        return row;
      }),
    [normalized],
  );

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
          const total = item.points.reduce(
            (sum, point) => sum + point.value,
            0,
          );
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
                borderColor: hidden
                  ? "var(--border-soft)"
                  : "var(--border-strong)",
                color: hidden ? "var(--faint)" : "var(--text-3)",
                opacity: hidden ? 0.65 : 1,
              }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: item.color }}
              />
              <span>{item.name}</span>
              <span className="tabular-nums" style={{ color: "var(--dim)" }}>
                {formatMeasureValue(total, measure)}
              </span>
            </button>
          );
        })}
        {hiddenSeries.size > 0 ? (
          <button
            type="button"
            onClick={() => setHiddenSeries(new Set())}
            className="cursor-pointer border-0 bg-transparent px-1.5 py-1 text-xs text-blue"
          >
            Show all
          </button>
        ) : null}
        <span className="ml-auto text-xs text-faint">
          Click a series to compare
        </span>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            key={granularity}
            data={chartData}
            margin={{ top: 20, right: 18, bottom: 10, left: 4 }}
          >
            <defs>
              {visibleSeries.map((item, index) => (
                <linearGradient
                  key={item.id}
                  id={`overview-gradient-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={item.color}
                    stopOpacity={visibleSeries.length === 1 ? 0.34 : 0.22}
                  />
                  <stop
                    offset="45%"
                    stopColor={item.color}
                    stopOpacity={visibleSeries.length === 1 ? 0.12 : 0.07}
                  />
                  <stop offset="95%" stopColor={item.color} stopOpacity={0} />
                </linearGradient>
              ))}
              {visibleSeries.map((item, index) => (
                <filter
                  key={item.id}
                  id={`overview-shadow-${index}`}
                  x="-20%"
                  y="-35%"
                  width="140%"
                  height="180%"
                >
                  <feDropShadow
                    dx="0"
                    dy="6"
                    stdDeviation="5"
                    floodColor="#020617"
                    floodOpacity="0.72"
                  />
                  <feDropShadow
                    dx="0"
                    dy="2"
                    stdDeviation="3"
                    floodColor={item.color}
                    floodOpacity="0.62"
                  />
                </filter>
              ))}
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--grid)"
              strokeDasharray="0"
            />
            <XAxis
              dataKey="period"
              axisLine={false}
              tickLine={false}
              minTickGap={48}
              tickMargin={10}
              height={38}
              tick={{ fill: "var(--dim)", fontSize: 11.5 }}
              tickFormatter={(period: string) =>
                formatOverviewPeriodLabel(period, granularity)
              }
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={58}
              tick={{ fill: "var(--dim)", fontSize: 11.5 }}
              tickFormatter={(value: number) =>
                formatMeasureValue(value, measure)
              }
            />
            <Tooltip
              content={
                <OverviewTooltip measure={measure} granularity={granularity} />
              }
              cursor={{ stroke: "var(--crosshair)", strokeWidth: 1 }}
            />
            {visibleSeries.map((item, index) => (
              <Line
                key={`${item.id}-shadow`}
                type="natural"
                dataKey={item.id}
                stroke={item.color}
                strokeWidth={3}
                strokeOpacity={0.48}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive
                animationDuration={500}
                animationEasing="ease-out"
                filter={`url(#overview-shadow-${index})`}
                legendType="none"
                tooltipType="none"
              />
            ))}
            {visibleSeries.map((item, index) => (
              <Area
                key={item.id}
                type="natural"
                dataKey={item.id}
                name={item.name}
                stroke={item.color}
                strokeWidth={visibleSeries.length === 1 ? 2.6 : 2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={`url(#overview-gradient-${index})`}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: item.color,
                  stroke: "var(--surface)",
                  strokeWidth: 2,
                }}
                connectNulls={false}
                isAnimationActive
                animationDuration={500}
                animationEasing="ease-out"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-faint">
        <span>Times shown in local time</span>
        <span>Hover the chart for exact dates and values</span>
      </div>
    </div>
  );
}

export function OverviewHero({
  rangeLabel,
  measure,
  splitBy,
  granularity,
  dateRange,
  dateFrom,
  dateTo,
  onMeasureChange,
  onSplitChange,
  onGranularityChange,
  onDateRangeChange,
  headline,
  deltaLabel,
  successRateLabel,
  failedLabel,
  topFailing,
  series,
  extendedAvailable,
}: OverviewHeroProps) {
  const [draftGranularity, setDraftGranularity] = useState(granularity);

  return (
    <section className="rounded-2xl border border-line bg-surface px-6 pb-[18px] pt-6">
      <div className="mb-[22px] flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[13px] text-dim">
            <span>{rangeLabel}</span>
            <span className="text-faint">·</span>
            <span className="text-faint">
              {formatDateWindow(dateFrom, dateTo)}
            </span>
          </div>
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
          <div className="flex min-w-[118px] flex-col items-center justify-between border-l border-line px-[22px] text-center">
            <div className="mb-1.5 text-xs text-dim">Most failures</div>
            <div className="flex items-center">
              <span className="rounded-lg bg-red-tint px-[7px] py-[3px] font-mono text-[11.5px] text-red">
                {topFailing || "—"}
              </span>
            </div>
          </div>
          <div className="flex items-center border-l border-line pl-[22px]">
            <DatePicker
              value={dateRange}
              onOpen={() => setDraftGranularity(granularity)}
              onChange={(nextRange) => {
                onDateRangeChange(nextRange);
                onGranularityChange(draftGranularity);
              }}
              label="Date range and chart interval"
              applyLabel="Apply"
              align="end"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-faint">Chart interval</span>
                <SegmentedControl
                  ariaLabel="Chart interval"
                  value={draftGranularity}
                  onChange={setDraftGranularity}
                  options={GRANULARITY_OPTIONS}
                />
              </div>
            </DatePicker>
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
      </div>

      <SeriesChart
        series={series}
        measure={measure}
        granularity={granularity}
      />
    </section>
  );
}
