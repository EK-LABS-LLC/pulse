import { describe, expect, test } from "bun:test";
import {
  buildSessionDetailPath,
  buildTraceDetailPath,
  resolveSessionReturnTarget,
  resolveTraceReturnTarget,
} from "./dashboardNavigation.ts";

describe("dashboard navigation", () => {
  test("carries the complete filtered origin into a trace detail URL", () => {
    const path = buildTraceDetailPath(
      "trace/with spaces",
      "/dashboard/traces?service=pulse-api&page=3",
    );

    expect(path).toBe(
      "/dashboard/traces/trace%2Fwith%20spaces?from=%2Fdashboard%2Ftraces%3Fservice%3Dpulse-api%26page%3D3",
    );
  });

  test("restores Overview as the trace breadcrumb and return target", () => {
    expect(
      resolveTraceReturnTarget("/dashboard?range=24h&measure=latency"),
    ).toEqual({
      to: "/dashboard?range=24h&measure=latency",
      label: "Overview",
    });
  });

  test("preserves a filtered Sessions origin", () => {
    const path = buildSessionDetailPath(
      "session-id",
      "/dashboard/sessions?range=7d&q=auth",
    );

    expect(
      resolveSessionReturnTarget(
        new URL(path, "https://pulse.local").searchParams.get("from"),
      ),
    ).toEqual({
      to: "/dashboard/sessions?range=7d&q=auth",
      label: "Sessions",
    });
  });

  test("rejects external and unrelated return targets", () => {
    expect(resolveTraceReturnTarget("//example.com/dashboard")).toEqual({
      to: "/dashboard/traces",
      label: "Traces",
    });
    expect(resolveSessionReturnTarget("/settings/admin")).toEqual({
      to: "/dashboard/sessions",
      label: "Sessions",
    });
  });
});
