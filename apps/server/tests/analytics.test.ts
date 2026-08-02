import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  authFetch,
  createTestProject,
  createTestTraces,
  createTestSpans,
  cleanupTestData,
} from "./setup";
import type { CostDataPoint } from "../db/analytics";

describe("Analytics Endpoint", () => {
  let testProject: { id: string; apiKey: string };

  beforeAll(async () => {
    console.log("[analytics.test] Setting up test project...");
    testProject = await createTestProject("Analytics Test Project");
    console.log(`[analytics.test] Created project: ${testProject.id}`);
    await createTestTraces(testProject.id, 20);
    console.log("[analytics.test] Created 20 test traces");
    await createTestSpans(testProject.id, 30);
    console.log("[analytics.test] Created 30 test spans");
  });

  afterAll(async () => {
    console.log("[analytics.test] Cleaning up test data...");
    await cleanupTestData();
  });

  describe("GET /v1/analytics", () => {
    const dateFrom = "2020-01-01T00:00:00Z";
    const dateTo = "2030-12-31T23:59:59Z";

    test("returns analytics data for project", async () => {
      const response = await authFetch(
        `/v1/analytics?date_from=${dateFrom}&date_to=${dateTo}`,
        testProject.apiKey,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("totalCost");
      expect(data).toHaveProperty("totalRequests");
      expect(data).toHaveProperty("totalSessions");
      expect(data).toHaveProperty("totalTokens");
      expect(data).toHaveProperty("avgLatency");
      expect(data).toHaveProperty("errorRate");
      expect(data).toHaveProperty("costOverTime");
      expect(data).toHaveProperty("computed");
    });

    test("totalRequests matches trace count", async () => {
      const response = await authFetch(
        `/v1/analytics?date_from=${dateFrom}&date_to=${dateTo}`,
        testProject.apiKey,
      );
      const data = (await response.json()) as { totalRequests: number };

      expect((data as { totalRequests: number }).totalRequests).toBe(20);
    });

    test("returns computed metrics", async () => {
      const response = await authFetch(
        `/v1/analytics?date_from=${dateFrom}&date_to=${dateTo}`,
        testProject.apiKey,
      );
      const data = (await response.json()) as {
        computed: {
          costPerRequest: number;
          tokensPerRequest: number;
          costPer1kTokens: number;
          tracesPerSession: number;
          avgInputTokens: number;
          avgOutputTokens: number;
        };
      };

      expect(data.computed).toHaveProperty("costPerRequest");
      expect(data.computed).toHaveProperty("tokensPerRequest");
      expect(data.computed).toHaveProperty("costPer1kTokens");
      expect(data.computed).toHaveProperty("tracesPerSession");
      expect(data.computed).toHaveProperty("avgInputTokens");
      expect(data.computed).toHaveProperty("avgOutputTokens");
    });

    test("returns token breakdown", async () => {
      const response = await authFetch(
        `/v1/analytics?date_from=${dateFrom}&date_to=${dateTo}`,
        testProject.apiKey,
      );
      const data = (await response.json()) as {
        totalTokens: { input: number; output: number; total: number };
      };

      expect(
        (
          data as {
            totalTokens: { input: number; output: number; total: number };
          }
        ).totalTokens,
      ).toHaveProperty("input");
      expect(data.totalTokens).toHaveProperty("output");
      expect(data.totalTokens).toHaveProperty("total");
      expect(data.totalTokens.total).toBe(
        data.totalTokens.input + data.totalTokens.output,
      );
    });

    test("calculates error rate correctly", async () => {
      const response = await authFetch(
        `/v1/analytics?date_from=${dateFrom}&date_to=${dateTo}`,
        testProject.apiKey,
      );
      const data = (await response.json()) as { errorRate: number };

      // We created 20 traces, 1 is error (first one in createTestTraces)
      expect(data.errorRate).toBe(5); // 1/20 = 5%
    });

    test("requires date_from parameter", async () => {
      const response = await authFetch(
        `/v1/analytics?date_to=${dateTo}`,
        testProject.apiKey,
      );

      expect(response.status).toBe(400);
    });

    test("requires date_to parameter", async () => {
      const response = await authFetch(
        `/v1/analytics?date_from=${dateFrom}`,
        testProject.apiKey,
      );

      expect(response.status).toBe(400);
    });

    test("requires ISO datetime format", async () => {
      const response = await authFetch(
        `/v1/analytics?date_from=2024-01-01&date_to=2024-12-31`,
        testProject.apiKey,
      );

      expect(response.status).toBe(400);
    });

    test("supports group_by parameter", async () => {
      const response = await authFetch(
        `/v1/analytics?date_from=${dateFrom}&date_to=${dateTo}&group_by=day`,
        testProject.apiKey,
      );
      const data = (await response.json()) as { costOverTime: CostDataPoint[] };

      expect(response.status).toBe(200);
      expect(data.costOverTime).toBeInstanceOf(Array);
    });
  });

  describe("GET /v1/analytics/spans", () => {
    const dateFrom = "2020-01-01T00:00:00Z";
    const dateTo = "2030-12-31T23:59:59Z";

    test("returns span analytics data with dashboard metrics", async () => {
      const response = await authFetch(
        `/v1/analytics/spans?date_from=${dateFrom}&date_to=${dateTo}`,
        testProject.apiKey,
      );
      const data = (await response.json()) as {
        agentRuns: number;
        toolCalls: number;
        avgSessionDurationMs: number;
        successRate: number;
        topTools: Array<{ name: string; count: number }>;
        totalSpans: number;
      };

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("agentRuns");
      expect(data).toHaveProperty("toolCalls");
      expect(data).toHaveProperty("avgSessionDurationMs");
      expect(data).toHaveProperty("successRate");
      expect(data).toHaveProperty("topTools");
      expect(data).toHaveProperty("totalSpans");
      expect(data.totalSpans).toBeGreaterThanOrEqual(30);
      expect(data.successRate).toBeGreaterThanOrEqual(0);
      expect(data.successRate).toBeLessThanOrEqual(100);
      expect(Array.isArray(data.topTools)).toBe(true);
    });

    test("measures session duration without a session lifecycle span", async () => {
      // Only tool_use spans, so a metric that reads durationMs off a span of
      // kind "session" has nothing to average and reports zero.
      const sessionId = crypto.randomUUID();
      const start = Date.now() - 60000;
      const spans = [0, 1, 2].map((index) => ({
        span_id: crypto.randomUUID(),
        session_id: sessionId,
        timestamp: new Date(start + index * 5000).toISOString(),
        duration_ms: 1000,
        source: "sdk" as const,
        kind: "tool_use" as const,
        event_type: "tool_request",
        status: "success" as const,
        tool_name: "Bash",
      }));

      const ingest = await authFetch("/v1/spans/batch", testProject.apiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spans),
      });
      expect(ingest.ok).toBe(true);

      // Sessions here span minutes of wall clock, while the lifecycle spans
      // that used to drive this metric carry sub-second durations — so the
      // threshold separates a derived measurement from the old one.
      let avgSessionDurationMs = 0;
      for (let attempt = 0; attempt < 25; attempt++) {
        const response = await authFetch(
          `/v1/analytics/spans?date_from=${dateFrom}&date_to=${dateTo}`,
          testProject.apiKey,
        );
        const data = (await response.json()) as {
          avgSessionDurationMs: number;
        };
        avgSessionDurationMs = data.avgSessionDurationMs;
        if (avgSessionDurationMs > 10_000) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      expect(avgSessionDurationMs).toBeGreaterThan(10_000);
    });

    test("requires date range for span analytics", async () => {
      const response = await authFetch(
        "/v1/analytics/spans",
        testProject.apiKey,
      );
      expect(response.status).toBe(400);
    });
  });

  describe("GET /v1/analytics/overview-extended", () => {
    const dateFrom = "2020-01-01T00:00:00Z";
    const dateTo = "2030-12-31T23:59:59Z";

    test("returns request series split by model", async () => {
      const response = await authFetch(
        `/v1/analytics/overview-extended?date_from=${dateFrom}&date_to=${dateTo}&measure=requests&split_by=model`,
        testProject.apiKey,
      );
      const data = (await response.json()) as {
        available: boolean;
        series: Array<{ name: string; points: Array<{ value: number }> }>;
      };

      expect(response.status).toBe(200);
      expect(data.available).toBe(true);
      expect(data.series).toHaveLength(1);
      expect(data.series[0]?.name).toBe("gpt-4o");
      expect(
        data.series[0]?.points.reduce((sum, point) => sum + point.value, 0),
      ).toBe(20);
    });

    test("supports cost series split by provider", async () => {
      const response = await authFetch(
        `/v1/analytics/overview-extended?date_from=${dateFrom}&date_to=${dateTo}&measure=cost&split_by=provider&group_by=hour`,
        testProject.apiKey,
      );
      const data = (await response.json()) as {
        series: Array<{ name: string; points: Array<{ value: number }> }>;
      };

      expect(response.status).toBe(200);
      expect(data.series.length).toBe(3);
      expect(data.series.map((series) => series.name).sort()).toEqual([
        "anthropic",
        "openai",
        "openrouter",
      ]);
      expect(
        data.series.reduce(
          (sum, series) =>
            sum + series.points.reduce((seriesSum, point) => seriesSum + point.value, 0),
          0,
        ),
      ).toBeGreaterThan(0);
    });

    test("returns latency percentiles", async () => {
      const response = await authFetch(
        `/v1/analytics/overview-extended?date_from=${dateFrom}&date_to=${dateTo}&measure=latency`,
        testProject.apiKey,
      );
      const data = (await response.json()) as {
        latencyPercentiles: { p50: number; p95: number; p99: number };
      };

      expect(response.status).toBe(200);
      expect(data.latencyPercentiles.p50).toBeGreaterThan(0);
      expect(data.latencyPercentiles.p95).toBeGreaterThanOrEqual(
        data.latencyPercentiles.p50,
      );
      expect(data.latencyPercentiles.p99).toBeGreaterThanOrEqual(
        data.latencyPercentiles.p95,
      );
    });

    test("requires a date range", async () => {
      const response = await authFetch(
        "/v1/analytics/overview-extended",
        testProject.apiKey,
      );
      expect(response.status).toBe(400);
    });
  });
});
