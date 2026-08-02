import type { OverviewSeries } from "./apiClient";

export type OverviewChartGranularity = "15m" | "hour" | "day";
export type OverviewPeriodLabelDetail = "axis" | "tooltip";

export interface NormalizedOverviewSeries extends Omit<
  OverviewSeries,
  "points"
> {
  points: Array<{ period: string; value: number | null }>;
}

export function calculateOverviewTrend(
  series: OverviewSeries[],
): number | null {
  const values = series
    .flatMap((item) => item.points)
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((point) => point.value);
  if (values.length < 2) return null;

  const midpoint = Math.floor(values.length / 2);
  const earlier = values.slice(0, midpoint).reduce((sum, value) => sum + value, 0);
  const later = values.slice(midpoint).reduce((sum, value) => sum + value, 0);
  if (earlier === 0) return null;

  return ((later - earlier) / earlier) * 100;
}

export function normalizeOverviewSeries(
  series: OverviewSeries[],
  missingValue: number | null,
): { periods: string[]; series: NormalizedOverviewSeries[] } {
  const periods = [
    ...new Set(
      series.flatMap((item) => item.points.map((point) => point.period)),
    ),
  ].sort((a, b) => a.localeCompare(b));

  return {
    periods,
    series: series.map((item) => {
      const valuesByPeriod = new Map(
        item.points.map((point) => [point.period, point.value]),
      );
      return {
        ...item,
        points: periods.map((period) => ({
          period,
          value: valuesByPeriod.get(period) ?? missingValue,
        })),
      };
    }),
  };
}

export function formatOverviewPeriodLabel(
  period: string,
  granularity: OverviewChartGranularity,
  detail: OverviewPeriodLabelDetail = "axis",
): string {
  const parsed = new Date(
    period.includes(" ")
      ? `${period.replace(" ", "T")}Z`
      : `${period}T00:00:00`,
  );
  if (Number.isNaN(parsed.getTime())) return period;

  if (granularity === "day") {
    return parsed.toLocaleDateString("en-US", {
      ...(detail === "tooltip" ? { weekday: "short", year: "numeric" } : {}),
      month: "short",
      day: "numeric",
    });
  }

  return parsed.toLocaleString("en-US", {
    ...(detail === "tooltip" ? { weekday: "short", year: "numeric" } : {}),
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute:
      granularity === "15m" || detail === "tooltip" ? "2-digit" : undefined,
  });
}
