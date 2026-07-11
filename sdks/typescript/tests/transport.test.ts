import { afterEach, describe, expect, it } from "bun:test";
import type { Span } from "../src/types";
import { toOtlpPayload, sendSpans } from "../src/transport/http";
import { generateSpanId, generateTraceId } from "../src/lib/ids";

const originalFetch = globalThis.fetch;

/**
 * Bun's `fetch` type also carries a `preconnect` method, so a bare function
 * cannot be assigned to `globalThis.fetch` without it.
 */
function mockFetch(
  handler: (url: string | URL | Request, init?: RequestInit) => Promise<Response>
): typeof fetch {
  return Object.assign(handler, { preconnect: originalFetch.preconnect }) as typeof fetch;
}

function sampleSpan(overrides: Partial<Span> = {}): Span {
  return {
    span_id: "2222222222222222",
    trace_id: "11111111111111111111111111111111",
    session_id: "session-123",
    timestamp: "2026-07-07T12:00:00.250Z",
    duration_ms: 250,
    source: "sdk",
    kind: "llm_call",
    event_type: "provider_call",
    status: "success",
    provider: "openai",
    model: "gpt-4o-mini",
    model_used: "gpt-4o-mini-2024-07-18",
    provider_request_id: "chatcmpl_123",
    input_tokens: 10,
    output_tokens: 20,
    cost_cents: 0.002,
    finish_reason: "stop",
    output_text: "Hello",
    metadata: { tenant: "acme" },
    ...overrides,
  };
}

function readAttribute(
  span: { attributes: Array<{ key: string; value: Record<string, unknown> }> },
  key: string
): unknown {
  const value = span.attributes.find((item) => item.key === key)?.value;

  if (!value) {
    return undefined;
  }

  if ("stringValue" in value) return value.stringValue;
  if ("boolValue" in value) return value.boolValue;
  if ("intValue" in value) return value.intValue;
  if ("doubleValue" in value) return value.doubleValue;

  return value;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("id generation", () => {
  it("produces OTel-compatible lowercase hex ids", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateTraceId()).toMatch(/^[0-9a-f]{32}$/);
      expect(generateSpanId()).toMatch(/^[0-9a-f]{16}$/);
    }
  });
});

describe("toOtlpPayload", () => {
  it("serializes spans as OTLP HTTP JSON", () => {
    const payload = toOtlpPayload([sampleSpan()]);

    const resourceAttr = payload.resourceSpans[0]?.resource?.attributes?.[0];
    expect(resourceAttr).toEqual({
      key: "service.name",
      value: { stringValue: "pulse-sdk" },
    });

    const span = payload.resourceSpans[0]?.scopeSpans[0]?.spans[0];
    expect(span).toBeDefined();
    expect(span?.traceId).toBe("11111111111111111111111111111111");
    expect(span?.spanId).toBe("2222222222222222");
    expect(span?.name).toBe("provider_call");
    expect(span?.startTimeUnixNano).toBe("1783425600250000000");
    expect(span?.endTimeUnixNano).toBe("1783425600500000000");
    expect(span?.status).toEqual({ code: 1 });

    expect(readAttribute(span!, "pulse.source")).toBe("sdk");
    expect(readAttribute(span!, "pulse.kind")).toBe("llm_call");
    expect(readAttribute(span!, "pulse.session_id")).toBe("session-123");
    expect(readAttribute(span!, "gen_ai.provider.name")).toBe("openai");
    expect(readAttribute(span!, "gen_ai.request.model")).toBe("gpt-4o-mini");
    expect(readAttribute(span!, "gen_ai.response.model")).toBe("gpt-4o-mini-2024-07-18");
    expect(readAttribute(span!, "gen_ai.response.id")).toBe("chatcmpl_123");
    expect(readAttribute(span!, "gen_ai.response.finish_reasons")).toBe('["stop"]');
    expect(readAttribute(span!, "gen_ai.usage.input_tokens")).toBe("10");
    expect(readAttribute(span!, "gen_ai.usage.output_tokens")).toBe("20");
    expect(readAttribute(span!, "pulse.cost_cents")).toBe(0.002);
    expect(readAttribute(span!, "pulse.output_text")).toBe("Hello");
    expect(readAttribute(span!, "tenant")).toBe("acme");
  });

  it("serializes tool spans with tool attributes and parent linkage", () => {
    const payload = toOtlpPayload([
      sampleSpan({
        kind: "tool_use",
        event_type: "tool_request",
        parent_span_id: "3333333333333333",
        tool_use_id: "call_abc",
        tool_name: "get_weather",
        tool_input: { city: "Berlin" },
        provider: undefined,
        model: undefined,
      }),
    ]);
    const span = payload.resourceSpans[0]?.scopeSpans[0]?.spans[0];

    expect(span?.name).toBe("get_weather");
    expect(span?.parentSpanId).toBe("3333333333333333");
    expect(readAttribute(span!, "pulse.tool.id")).toBe("call_abc");
    expect(readAttribute(span!, "gen_ai.tool.name")).toBe("get_weather");
    expect(readAttribute(span!, "gen_ai.tool.input")).toBe('{"city":"Berlin"}');
  });

  it("marks error spans with an OTLP error status and message", () => {
    const payload = toOtlpPayload([
      sampleSpan({
        status: "error",
        error: { name: "APIError", message: "provider unavailable" },
      }),
    ]);
    const span = payload.resourceSpans[0]?.scopeSpans[0]?.spans[0];

    expect(span?.status).toEqual({ code: 2, message: "provider unavailable" });
    expect(readAttribute(span!, "pulse.error")).toBe(
      '{"name":"APIError","message":"provider unavailable"}'
    );
  });
});

describe("sendSpans", () => {
  it("posts OTLP JSON to /v1/traces", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    globalThis.fetch = mockFetch((url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    await sendSpans("https://pulse.example", "pulse_sk_test", [sampleSpan()]);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://pulse.example/v1/traces");
    expect(calls[0]?.init.method).toBe("POST");
    expect(calls[0]?.init.headers).toEqual({
      Authorization: "Bearer pulse_sk_test",
      "Content-Type": "application/json",
    });

    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body.resourceSpans[0].scopeSpans[0].spans).toHaveLength(1);
  });

  it("does not call fetch when there are no spans", async () => {
    let called = false;
    globalThis.fetch = mockFetch(() => {
      called = true;
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    await sendSpans("https://pulse.example", "pulse_sk_test", []);

    expect(called).toBe(false);
  });
});
