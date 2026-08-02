import { useMemo, useState } from "react";
import {
  OverviewHero,
  type OverviewGranularity,
  type OverviewMeasure,
  type OverviewSplit,
} from "../components/dashboard/OverviewHero";
import { OverviewMetricStrip } from "../components/dashboard/OverviewMetricStrip";
import { OverviewToolUsage } from "../components/dashboard/OverviewToolUsage";
import { ServiceHealthTable } from "../components/dashboard/ServiceHealthTable";
import { TimeRangeTabs } from "../components/dashboard/TimeRangeTabs";
import type {
  TimeRange,
  TimeRangeSelection,
} from "../components/dashboard/TimeRangeTabs";
import { RecentTracesTable } from "../components/dashboard/RecentTracesTable";
import {
  useAnalyticsQuery,
  useOverviewExtendedQuery,
  useSpansAnalyticsQuery,
  useTracesQuery,
} from "../api";
import { useProject } from "../hooks/useProject";
import type { OverviewSeries } from "../lib/apiClient";
import {
  formatLocalDateKey,
  getCustomDateWindow,
  getDateWindow,
} from "../lib/date";
import { fmtCost, fmtDuration, fmtLatency } from "../lib/format";
import { calculateOverviewTrend } from "../lib/overviewChart";

const RefreshIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function rangeLabel(range: TimeRangeSelection): string {
  if (range === "24h") return "Last 24 hours";
  if (range === "7d") return "Last 7 days";
  if (range === "30d") return "Last 30 days";
  return "Custom range";
}

function recommendedGranularity(range: TimeRange): OverviewGranularity {
  if (range === "24h") return "15m";
  if (range === "7d") return "hour";
  return "day";
}

function buildProvisionalSeries(
  measure: OverviewMeasure,
  costOverTime: Array<{ period: string; provider: string; costCents: number }>,
  spansOverTime: Array<{ period: string; count: number }>,
  totalTokens: { input: number; output: number } | undefined,
): OverviewSeries[] {
  if (measure === "latency") return [];

  if (measure === "cost") {
    const byPeriod = new Map<string, number>();
    for (const point of costOverTime) {
      byPeriod.set(
        point.period,
        (byPeriod.get(point.period) ?? 0) + point.costCents / 100,
      );
    }
    const points = [...byPeriod.entries()].map(([period, value]) => ({
      period,
      value,
    }));
    if (points.length === 0) return [];
    return [
      {
        id: "cost",
        name: "Cost",
        color: "var(--green)",
        points,
      },
    ];
  }

  if (measure === "tokens") {
    if (!totalTokens) return [];
    return [
      {
        id: "tokens-in",
        name: "Input",
        color: "var(--blue)",
        points: [{ period: "period", value: totalTokens.input }],
      },
      {
        id: "tokens-out",
        name: "Output",
        color: "var(--purple)",
        points: [{ period: "period", value: totalTokens.output }],
      },
    ];
  }

  // requests
  if (spansOverTime.length === 0) return [];
  return [
    {
      id: "requests",
      name: "Spans",
      color: "var(--blue)",
      points: spansOverTime.map((point) => ({
        period: point.period,
        value: point.count,
      })),
    },
  ];
}

export default function Dashboard() {
  const { selectedProject } = useProject();
  const [timeRange, setTimeRange] = useState<TimeRangeSelection>("7d");
  const [endingDate, setEndingDate] = useState(() =>
    formatLocalDateKey(new Date()),
  );
  const [customDateRange, setCustomDateRange] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [dateRangeAnchor, setDateRangeAnchor] = useState(() => new Date());
  const [measure, setMeasure] = useState<OverviewMeasure>("requests");
  const [splitBy, setSplitBy] = useState<OverviewSplit>("none");
  const [granularity, setGranularity] = useState<OverviewGranularity>("hour");

  const { date_from, date_to } = useMemo(
    () =>
      timeRange === "custom" && customDateRange
        ? getCustomDateWindow(
            customDateRange.from,
            customDateRange.to,
            dateRangeAnchor,
          )
        : getDateWindow(
            timeRange === "custom" ? "7d" : timeRange,
            endingDate,
            dateRangeAnchor,
          ),
    [customDateRange, dateRangeAnchor, endingDate, timeRange],
  );
  const calendarDateRange = useMemo(
    () => ({
      from: formatLocalDateKey(new Date(date_from)),
      to: formatLocalDateKey(new Date(date_to)),
    }),
    [date_from, date_to],
  );

  const analyticsQuery = useAnalyticsQuery(
    "dashboard-analytics",
    selectedProject?.id,
    { date_from, date_to, group_by: "day" },
  );

  const spansQuery = useSpansAnalyticsQuery(
    "dashboard-spans-analytics",
    selectedProject?.id,
    { date_from, date_to, group_by: "day" },
  );

  const overviewExtendedQuery = useOverviewExtendedQuery(
    "dashboard-overview-extended",
    selectedProject?.id,
    {
      date_from,
      date_to,
      group_by: granularity,
      measure,
      split_by: splitBy,
    },
  );

  const trendOverviewQuery = useOverviewExtendedQuery(
    "dashboard-overview-extended",
    selectedProject?.id,
    {
      date_from,
      date_to,
      group_by: granularity,
      measure,
      split_by: "none",
    },
  );

  const recentTracesQuery = useTracesQuery(
    "dashboard-recent-traces",
    selectedProject?.id,
    { limit: 10 },
  );

  const analytics = analyticsQuery.data;
  const spansAnalytics = spansQuery.data;
  const overviewExtended =
    overviewExtendedQuery.data ??
    ({
      available: false,
      latencyPercentiles: null,
      latencyHistogram: [],
      series: [],
      errorTaxonomy: [],
      heatmap: [],
    } as const);
  const recentTraces = recentTracesQuery.data?.traces ?? [];

  const loading =
    analyticsQuery.isPending ||
    analyticsQuery.isFetching ||
    spansQuery.isPending;
  const tracesLoading =
    recentTracesQuery.isPending || recentTracesQuery.isFetching;
  const error =
    analyticsQuery.error instanceof Error
      ? analyticsQuery.error.message
      : spansQuery.error instanceof Error
        ? spansQuery.error.message
        : null;

  const totalSpans = spansAnalytics?.totalSpans ?? 0;
  const spanErrorRate = spansAnalytics?.errorRate ?? 0;
  const failedSpans = Math.round(totalSpans * (spanErrorRate / 100));
  const successRate = spansAnalytics?.successRate ?? 100 - spanErrorRate;
  const topTools = spansAnalytics?.topTools ?? [];
  const serviceRows = (spansAnalytics?.serviceStats ?? []).map((row) => ({
    name: row.service,
    requests: row.requests,
    errors: row.errors,
    avgDurationMs: row.avgDurationMs,
  }));
  const topFailing =
    [...serviceRows].sort((a, b) => b.errors - a.errors)[0]?.name ??
    overviewExtended.errorTaxonomy[0]?.type ??
    null;

  const provisionalSeries = useMemo(
    () =>
      buildProvisionalSeries(
        measure,
        analytics?.costOverTime ?? [],
        spansAnalytics?.spansOverTime ?? [],
        analytics?.totalTokens,
      ),
    [measure, analytics?.costOverTime, analytics?.totalTokens, spansAnalytics],
  );

  const heroSeries =
    overviewExtended.available && overviewExtended.series.length > 0
      ? overviewExtended.series
      : provisionalSeries;
  const trendSeries =
    trendOverviewQuery.data?.available &&
    trendOverviewQuery.data.series.length > 0
      ? trendOverviewQuery.data.series
      : splitBy === "none"
        ? heroSeries
        : [];
  const trendPercent = calculateOverviewTrend(trendSeries);
  const deltaLabel =
    trendPercent === null
      ? undefined
      : `${trendPercent >= 0 ? "↑" : "↓"} ${Math.abs(trendPercent).toFixed(1)}% vs. earlier in the period`;

  const headline = (() => {
    if (measure === "cost") {
      return analytics ? fmtCost(analytics.totalCost * 100) : "—";
    }
    if (measure === "latency") {
      return overviewExtended.latencyPercentiles
        ? fmtLatency(overviewExtended.latencyPercentiles.p50)
        : analytics
          ? fmtLatency(analytics.avgLatency)
          : "—";
    }
    if (measure === "tokens") {
      return analytics
        ? formatNumber(
            analytics.totalTokens.input + analytics.totalTokens.output,
          )
        : "—";
    }
    return analytics
      ? formatNumber(analytics.totalRequests)
      : formatNumber(totalSpans);
  })();

  // analytics.totalCost is already dollars in the existing dashboard API.
  const costCentsForStrip = analytics ? analytics.totalCost * 100 : null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-topbar px-5 backdrop-blur">
        <h1 className="text-[19px] font-semibold tracking-[-0.022em] text-fg">
          Overview
        </h1>
        <div className="flex items-center gap-3">
          <TimeRangeTabs
            value={timeRange}
            onChange={(nextRange) => {
              setTimeRange(nextRange);
              setCustomDateRange(null);
              setGranularity(recommendedGranularity(nextRange));
            }}
          />
          <button
            type="button"
            aria-label="Refresh overview"
            onClick={() => {
              setDateRangeAnchor(new Date());
              analyticsQuery.refetch();
              spansQuery.refetch();
              overviewExtendedQuery.refetch();
              trendOverviewQuery.refetch();
            }}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-fg-4 transition-colors hover:bg-hover hover:text-fg disabled:opacity-50"
          >
            <span className={loading ? "inline-block animate-spin" : ""}>
              <RefreshIcon />
            </span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 p-6">
          {error && (
            <div className="rounded-xl border border-red-border bg-red-tint p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-red-text">{error}</p>
                <button
                  type="button"
                  onClick={() => analyticsQuery.refetch()}
                  className="whitespace-nowrap text-sm text-accent hover:underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          <OverviewHero
            rangeLabel={rangeLabel(timeRange)}
            measure={measure}
            splitBy={splitBy}
            granularity={granularity}
            dateRange={calendarDateRange}
            dateFrom={date_from}
            dateTo={date_to}
            onMeasureChange={setMeasure}
            onSplitChange={setSplitBy}
            onGranularityChange={setGranularity}
            onDateRangeChange={(nextRange) => {
              setCustomDateRange(nextRange);
              setEndingDate(nextRange.to);
              setTimeRange("custom");
              setDateRangeAnchor(new Date());
            }}
            headline={headline}
            deltaLabel={deltaLabel}
            successRateLabel={`${successRate.toFixed(1)}%`}
            failedLabel={failedSpans.toLocaleString()}
            topFailing={topFailing}
            series={heroSeries}
            extendedAvailable={overviewExtended.available}
          />

          <OverviewMetricStrip
            metrics={[
              {
                label: "Sessions",
                value: analytics ? formatNumber(analytics.totalSessions) : "—",
                sub: rangeLabel(timeRange),
              },
              {
                label: "Agent runs",
                value: formatNumber(spansAnalytics?.agentRuns ?? 0),
                sub: rangeLabel(timeRange),
              },
              {
                label: "Tool calls",
                value: formatNumber(spansAnalytics?.toolCalls ?? 0),
                sub: rangeLabel(timeRange),
              },
              {
                label: "Avg session",
                value: fmtDuration(spansAnalytics?.avgSessionDurationMs ?? 0),
                sub: rangeLabel(timeRange),
              },
              {
                label: "Cost",
                value: fmtCost(costCentsForStrip),
                sub: rangeLabel(timeRange),
              },
            ]}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <OverviewToolUsage
              data={topTools}
              rangeLabel={rangeLabel(timeRange)}
            />
            <ServiceHealthTable
              rows={serviceRows}
              rangeLabel={rangeLabel(timeRange)}
            />
          </div>

          <RecentTracesTable traces={recentTraces} loading={tracesLoading} />
        </div>
      </div>
    </div>
  );
}
