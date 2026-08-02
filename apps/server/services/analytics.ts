import type { Database } from "../db/index";
import type { ServiceStats } from "../db/analytics";
import type { GroupBy, SpanAnalyticsGroupBy } from "../shared/validation";
import {
  getTotalCost,
  getTotalTokens,
  getAvgLatency,
  getErrorRate,
  getCostOverTime,
  getTotalRequests,
  getTotalSessions,
  getCostByProvider,
  getStatsByModel,
  getCostOverTimeByProvider,
  getTotalSpanEvents,
  getSpanErrorRate,
  getAvgSpanDuration,
  getSpanCountsByKind,
  getSpanCountsBySource,
  getSpanCountsOverTime,
  getAvgSessionSpanDuration,
  getTopTools,
  getServiceStats,
  getOverviewSeries,
  getOverviewLatencyPercentiles,
  type CostByProvider,
  type StatsByModel,
  type CostOverTimeByProvider,
  type SpanCountByKind,
  type SpanCountBySource,
  type SpanCountOverTime,
  type TopToolUsage,
  type OverviewMeasure,
  type OverviewSplitBy,
  type OverviewLatencyPercentiles,
} from "../db/analytics";

/**
 * Date range for analytics queries.
 */
export interface AnalyticsDateRange {
  dateFrom: Date;
  dateTo: Date;
}

/**
 * Computed metrics derived from raw data.
 */
export interface ComputedMetrics {
  costPerRequest: number;
  tokensPerRequest: number;
  costPer1kTokens: number;
  tracesPerSession: number;
  avgInputTokens: number;
  avgOutputTokens: number;
}

/**
 * Result of an analytics query.
 */
export interface AnalyticsResult {
  totalCost: number;
  totalRequests: number;
  totalSessions: number;
  totalTokens: {
    input: number;
    output: number;
    total: number;
  };
  avgLatency: number;
  errorRate: number;
  costOverTime: CostOverTimeByProvider[];
  costByProvider: CostByProvider[];
  topModels: StatsByModel[];
  computed: ComputedMetrics;
}

export interface SpanAnalyticsResult {
  agentRuns: number;
  toolCalls: number;
  avgSessionDurationMs: number;
  successRate: number;
  topTools: TopToolUsage[];
  totalSpans: number;
  errorRate: number;
  avgDurationMs: number;
  spansByKind: SpanCountByKind[];
  spansBySource: SpanCountBySource[];
  spansOverTime: SpanCountOverTime[];
  serviceStats: ServiceStats[];
}

export interface OverviewSeriesPoint {
  period: string;
  value: number;
}

export interface OverviewSeries {
  id: string;
  name: string;
  color: string;
  points: OverviewSeriesPoint[];
}

export interface OverviewExtendedResult {
  available: true;
  latencyPercentiles: OverviewLatencyPercentiles;
  latencyHistogram: [];
  series: OverviewSeries[];
  errorTaxonomy: [];
  heatmap: [];
}

const OVERVIEW_COLORS = [
  "var(--blue)",
  "var(--purple)",
  "var(--teal)",
  "var(--orange)",
  "var(--green)",
  "var(--pink)",
];

const MEASURE_LABELS: Record<OverviewMeasure, string> = {
  requests: "Requests",
  cost: "Cost",
  latency: "Latency",
  tokens: "Tokens",
};

/**
 * Safely divide two numbers, returning 0 if divisor is 0.
 */
function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Compute derived metrics from raw analytics data.
 */
function computeMetrics(
  totalCost: number,
  totalRequests: number,
  totalSessions: number,
  inputTokens: number,
  outputTokens: number,
  totalTokens: number,
): ComputedMetrics {
  return {
    costPerRequest: safeDivide(totalCost, totalRequests),
    tokensPerRequest: safeDivide(totalTokens, totalRequests),
    costPer1kTokens: safeDivide(totalCost, totalTokens) * 1000,
    tracesPerSession: safeDivide(totalRequests, totalSessions),
    avgInputTokens: safeDivide(inputTokens, totalRequests),
    avgOutputTokens: safeDivide(outputTokens, totalRequests),
  };
}

/**
 * Get analytics for a project within a date range.
 * Aggregates cost, tokens, latency, and error rate.
 */
export async function getAnalytics(
  projectId: string,
  dateRange: AnalyticsDateRange,
  db: Database,
  groupBy?: GroupBy,
): Promise<AnalyticsResult> {
  const dbDateRange = {
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  };

  const [
    totalCost,
    totalRequests,
    totalSessions,
    tokens,
    avgLatency,
    errorRate,
    costOverTimeByProvider,
    costByProvider,
    topModels,
  ] = await Promise.all([
    getTotalCost(db, projectId, dbDateRange),
    getTotalRequests(db, projectId, dbDateRange),
    getTotalSessions(db, projectId, dbDateRange),
    getTotalTokens(db, projectId, dbDateRange),
    getAvgLatency(db, projectId, dbDateRange),
    getErrorRate(db, projectId, dbDateRange),
    getCostOverTimeByProvider(
      db,
      projectId,
      dbDateRange,
      groupBy === "hour" ? "hour" : "day",
    ),
    getCostByProvider(db, projectId, dbDateRange),
    getStatsByModel(db, projectId, dbDateRange, 5),
  ]);

  const computed = computeMetrics(
    totalCost,
    totalRequests,
    totalSessions,
    tokens.inputTokens,
    tokens.outputTokens,
    tokens.totalTokens,
  );

  return {
    totalCost,
    totalRequests,
    totalSessions,
    totalTokens: {
      input: tokens.inputTokens,
      output: tokens.outputTokens,
      total: tokens.totalTokens,
    },
    avgLatency,
    errorRate,
    costOverTime: costOverTimeByProvider,
    costByProvider,
    topModels,
    computed,
  };
}

export async function getSpanAnalytics(
  projectId: string,
  dateRange: AnalyticsDateRange,
  db: Database,
  groupBy: SpanAnalyticsGroupBy = "day",
): Promise<SpanAnalyticsResult> {
  const dbDateRange = {
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  };

  const [
    totalSpans,
    errorRate,
    avgDurationMs,
    spansByKind,
    spansBySource,
    spansOverTime,
    avgSessionDurationMs,
    topTools,
    serviceStats,
  ] =
    await Promise.all([
      getTotalSpanEvents(db, projectId, dbDateRange),
      getSpanErrorRate(db, projectId, dbDateRange),
      getAvgSpanDuration(db, projectId, dbDateRange),
      getSpanCountsByKind(db, projectId, dbDateRange),
      getSpanCountsBySource(db, projectId, dbDateRange),
      getSpanCountsOverTime(db, projectId, dbDateRange, groupBy),
      getAvgSessionSpanDuration(db, projectId, dbDateRange),
      getTopTools(db, projectId, dbDateRange),
      getServiceStats(db, projectId, dbDateRange),
    ]);

  const byKind = new Map(spansByKind.map((row) => [row.kind, row.count]));
  const agentRuns = byKind.get("agent_run") ?? 0;
  const toolCalls = byKind.get("tool_use") ?? 0;
  const successRate = totalSpans === 0 ? 0 : 100 - errorRate;

  return {
    agentRuns,
    toolCalls,
    avgSessionDurationMs,
    successRate,
    topTools,
    totalSpans,
    errorRate,
    avgDurationMs,
    spansByKind,
    spansBySource,
    spansOverTime,
    serviceStats,
  };
}

export async function getOverviewExtended(
  projectId: string,
  dateRange: AnalyticsDateRange,
  db: Database,
  measure: OverviewMeasure = "requests",
  splitBy: OverviewSplitBy = "none",
  groupBy: "day" | "hour" = "day",
): Promise<OverviewExtendedResult> {
  const [rows, latencyPercentiles] = await Promise.all([
    getOverviewSeries(db, projectId, dateRange, measure, splitBy, groupBy),
    getOverviewLatencyPercentiles(db, projectId, dateRange),
  ]);

  const dimensions = [...new Set(rows.map((row) => row.dimension))];
  const series = dimensions.map((dimension, index) => ({
    id: `${splitBy}-${dimension}`,
    name:
      splitBy === "none" ? MEASURE_LABELS[measure] : dimension,
    color: OVERVIEW_COLORS[index % OVERVIEW_COLORS.length] ?? "var(--blue)",
    points: rows
      .filter((row) => row.dimension === dimension)
      .map(({ period, value }) => ({ period, value })),
  }));

  return {
    available: true,
    latencyPercentiles,
    latencyHistogram: [],
    series,
    errorTaxonomy: [],
    heatmap: [],
  };
}
