/**
 * E2E Integration Tests
 *
 * Tests that verify the full flow:
 * 1. Test server makes real LLM API calls with Pulse SDK
 * 2. Traces are sent to the real trace-service
 * 3. Traces can be retrieved from the trace-service API
 *
 * Requires:
 * - trace-service running
 * - test-server running
 * - Valid API keys configured
 */

import { describe, expect, it, beforeAll } from "bun:test";
import { calculateCost } from "../src/lib/pricing";

type ProviderName = "openai" | "anthropic";

interface Trace {
  traceId: string;
  timestamp: string;
  provider: string;
  modelRequested: string;
  modelUsed?: string;
  status: "success" | "error";
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  costCents?: number;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

interface TracesResponse {
  traces: Trace[];
  total: number;
}

interface HealthResponse {
  openai: boolean;
  anthropic: boolean;
}

interface RunResponse {
  model?: string;
  content?: string | null;
  error?: string;
}

const TEST_SERVER_URL = process.env.TEST_SERVER_URL || "http://localhost:3001";
const TRACE_SERVICE_URL = process.env.TRACE_SERVICE_URL || "http://localhost:3000";
const PULSE_API_KEY = process.env.PULSE_API_KEY;

if (!PULSE_API_KEY) {
  throw new Error("PULSE_API_KEY is required to run E2E tests");
}

/**
 * Helper to wait for traces to be flushed and processed
 */
async function waitForTraces(ms = 2000): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to fetch traces from trace-service
 */
async function getTraces(
  params: { limit?: number; provider?: string; sessionId?: string } = {}
): Promise<TracesResponse> {
  const url = new URL(`${TRACE_SERVICE_URL}/v1/traces`);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.provider) url.searchParams.set("provider", params.provider);
  if (params.sessionId) url.searchParams.set("session_id", params.sessionId);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${PULSE_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch traces: ${response.status}`);
  }

  return response.json() as Promise<TracesResponse>;
}

/**
 * Helper to check test server health and available providers
 */
async function getTestServerHealth(): Promise<HealthResponse> {
  const response = await fetch(`${TEST_SERVER_URL}/health`);
  const data = (await response.json()) as HealthResponse;
  return data;
}

async function triggerRun(
  provider: ProviderName,
  options: { pulseSessionId?: string; pulseMetadata?: Record<string, unknown> } = {}
): Promise<void> {
  const response = await fetch(`${TEST_SERVER_URL}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, ...options }),
  });

  expect(response.ok).toBe(true);
  const data = (await response.json()) as RunResponse;
  expect(data.error).toBeUndefined();
  expect(data.model).toBeDefined();
}

describe("E2E Integration Tests", () => {
  let availableProviders: HealthResponse;

  beforeAll(async () => {
    // Check which providers are available
    try {
      availableProviders = await getTestServerHealth();
      console.log("Available providers:", availableProviders);
    } catch {
      throw new Error(`Test server not reachable at ${TEST_SERVER_URL}. Make sure it's running.`);
    }
  });

  describe("OpenAI Integration", () => {
    it("should capture trace for OpenAI completion", async () => {
      if (!availableProviders.openai) {
        console.log("Skipping: OpenAI not configured");
        return;
      }

      await triggerRun("openai");

      // Wait for trace to be flushed
      await waitForTraces();

      // Verify trace was recorded in trace-service
      const tracesResponse = await getTraces({ provider: "openai", limit: 1 });
      expect(tracesResponse.traces.length).toBeGreaterThan(0);

      const trace = tracesResponse.traces[0];
      if (!trace) {
        throw new Error("Expected at least one OpenAI trace");
      }
      expect(trace.provider).toBe("openai");
      expect(trace.status).toBe("success");
      expect(trace.modelRequested).toContain("gpt-4o-mini");
      expect(trace.inputTokens).toBeGreaterThan(0);
      expect(trace.outputTokens).toBeGreaterThan(0);
      expect(trace.latencyMs).toBeGreaterThan(0);
      expect(trace.costCents).toBeGreaterThanOrEqual(0);

      const expectedCost = calculateCost(
        trace.modelRequested,
        trace.inputTokens ?? 0,
        trace.outputTokens ?? 0
      );
      if (expectedCost !== null && typeof trace.costCents === "number") {
        expect(trace.costCents).toBeCloseTo(expectedCost, 3);
      }
    });
  });

  describe("Anthropic Integration", () => {
    it("should capture trace for Anthropic completion", async () => {
      if (!availableProviders.anthropic) {
        console.log("Skipping: Anthropic not configured");
        return;
      }

      await triggerRun("anthropic");

      // Wait for trace to be flushed
      await waitForTraces();

      // Verify trace was recorded in trace-service
      const tracesResponse = await getTraces({ provider: "anthropic", limit: 1 });
      expect(tracesResponse.traces.length).toBeGreaterThan(0);

      const trace = tracesResponse.traces[0];
      if (!trace) {
        throw new Error("Expected at least one Anthropic trace");
      }
      expect(trace.provider).toBe("anthropic");
      expect(trace.status).toBe("success");
      expect(trace.modelRequested).toContain("claude");
      expect(trace.inputTokens).toBeGreaterThan(0);
      expect(trace.outputTokens).toBeGreaterThan(0);
      expect(trace.latencyMs).toBeGreaterThan(0);
      expect(trace.costCents).toBeGreaterThanOrEqual(0);

      const expectedCost = calculateCost(
        trace.modelRequested,
        trace.inputTokens ?? 0,
        trace.outputTokens ?? 0
      );
      if (expectedCost !== null && typeof trace.costCents === "number") {
        expect(trace.costCents).toBeCloseTo(expectedCost, 3);
      }
    });
  });

  describe("Trace Data Validation", () => {
    it("should have valid trace structure", async () => {
      // Get any recent trace
      const tracesResponse = await getTraces({ limit: 1 });

      if (tracesResponse.traces.length === 0) {
        console.log("Skipping: No traces available");
        return;
      }

      const trace = tracesResponse.traces[0];
      if (!trace) {
        throw new Error("Expected at least one trace to validate");
      }

      // Validate required fields
      expect(trace.traceId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(trace.timestamp).toBeDefined();
      expect(new Date(trace.timestamp).toISOString()).toBe(trace.timestamp);
      expect(["openai", "anthropic"]).toContain(trace.provider);
      expect(trace.modelRequested).toBeDefined();
      expect(["success", "error"]).toContain(trace.status);
      expect(typeof trace.latencyMs).toBe("number");
    });
  });

  describe("Session Correlation", () => {
    it("should persist the same session_id and metadata across providers", async () => {
      if (!availableProviders.openai || !availableProviders.anthropic) {
        console.log("Skipping: OpenAI or Anthropic not configured");
        return;
      }

      const sessionId = crypto.randomUUID();
      const metadata = { scenario: "session-correlation", turn: 1 };

      await triggerRun("openai", { pulseSessionId: sessionId, pulseMetadata: metadata });
      await triggerRun("anthropic", { pulseSessionId: sessionId, pulseMetadata: metadata });

      await waitForTraces();

      const tracesResponse = await getTraces({ sessionId, limit: 10 });
      const traces = tracesResponse.traces.filter(
        (trace) => trace.provider === "openai" || trace.provider === "anthropic"
      );

      expect(traces.length).toBeGreaterThanOrEqual(2);
      for (const trace of traces) {
        expect(trace.sessionId).toBe(sessionId);
        expect(trace.metadata).toEqual(metadata);
      }
    });
  });
});
