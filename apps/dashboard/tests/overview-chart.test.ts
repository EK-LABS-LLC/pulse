import { describe, expect, test } from "bun:test";
import {
  calculateOverviewTrend,
  formatOverviewPeriodLabel,
  normalizeOverviewSeries,
} from "../src/lib/overviewChart";

describe("Overview chart", () => {
  test("aligns every series to one chronological timeline", () => {
    const normalized = normalizeOverviewSeries(
      [
        {
          id: "api",
          name: "API",
          color: "blue",
          points: [
            { period: "2026-08-03", value: 3 },
            { period: "2026-08-01", value: 1 },
          ],
        },
        {
          id: "worker",
          name: "Worker",
          color: "purple",
          points: [{ period: "2026-08-02", value: 2 }],
        },
      ],
      0,
    );

    expect(normalized.periods).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
    expect(normalized.series[0]?.points.map((point) => point.value)).toEqual([
      1, 0, 3,
    ]);
    expect(normalized.series[1]?.points.map((point) => point.value)).toEqual([
      0, 2, 0,
    ]);
  });

  test("can preserve gaps for non-additive latency series", () => {
    const normalized = normalizeOverviewSeries(
      [
        {
          id: "api",
          name: "API",
          color: "blue",
          points: [{ period: "2026-08-01", value: 120 }],
        },
        {
          id: "worker",
          name: "Worker",
          color: "purple",
          points: [{ period: "2026-08-02", value: 240 }],
        },
      ],
      null,
    );

    expect(normalized.series[0]?.points[1]?.value).toBeNull();
    expect(normalized.series[1]?.points[0]?.value).toBeNull();
  });

  test("keeps date context in sub-day axis and tooltip labels", () => {
    const period = "2026-08-01 08:15:00";

    expect(formatOverviewPeriodLabel(period, "15m")).toMatch(/Jul 31|Aug 1/);
    expect(formatOverviewPeriodLabel(period, "15m", "tooltip")).toContain(
      "2026",
    );
    expect(formatOverviewPeriodLabel("2026-08-01", "day")).toBe("Aug 1");
  });

  test("compares the later half of the selected period with the earlier half", () => {
    expect(
      calculateOverviewTrend([
        {
          id: "requests",
          name: "Requests",
          color: "blue",
          points: [
            { period: "2026-08-01", value: 10 },
            { period: "2026-08-02", value: 20 },
            { period: "2026-08-03", value: 15 },
            { period: "2026-08-04", value: 30 },
          ],
        },
      ]),
    ).toBe(50);
  });

  test("omits a percentage when the earlier half has no activity", () => {
    expect(
      calculateOverviewTrend([
        {
          id: "requests",
          name: "Requests",
          color: "blue",
          points: [
            { period: "2026-08-01", value: 0 },
            { period: "2026-08-02", value: 10 },
          ],
        },
      ]),
    ).toBeNull();
  });
});
