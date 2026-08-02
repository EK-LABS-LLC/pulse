import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { recordSpan, isRecording } from "../src/core/record";
import {
  getBufferSize,
  resetState,
  setConfig,
  stopFlushInterval,
} from "../src/core/state";
import { loadConfig } from "../src/core/config";

function configure(overrides: Record<string, unknown> = {}) {
  setConfig(
    loadConfig({
      apiKey: "pulse_sk_test",
      apiUrl: "http://localhost:3000",
      batchSize: 100,
      flushInterval: 5000,
      enabled: true,
      ...overrides,
    }),
  );
}

describe("recordSpan", () => {
  beforeEach(() => configure());

  afterEach(() => {
    stopFlushInterval();
    resetState();
  });

  it("buffers a span with sdk source and sensible defaults", () => {
    const span = recordSpan({ model: "claude-opus-4", provider: "anthropic" });

    expect(span.source).toBe("sdk");
    expect(span.kind).toBe("llm_call");
    expect(span.event_type).toBe("provider_call");
    expect(span.status).toBe("success");
    expect(span.span_id).toBeTruthy();
    expect(span.trace_id).toBeTruthy();
    expect(span.session_id).toBeTruthy();
    expect(getBufferSize()).toBe(1);
  });

  it("carries token, cost and model fields through unchanged", () => {
    const span = recordSpan({
      model: "gpt-4o",
      model_used: "gpt-4o-2024-08-06",
      provider: "openai",
      input_tokens: 1200,
      output_tokens: 340,
      cost_cents: 2.75,
      duration_ms: 812,
      finish_reason: "stop",
    });

    expect(span.input_tokens).toBe(1200);
    expect(span.output_tokens).toBe(340);
    expect(span.cost_cents).toBe(2.75);
    expect(span.model_used).toBe("gpt-4o-2024-08-06");
    expect(span.duration_ms).toBe(812);
    expect(span.finish_reason).toBe("stop");
  });

  it("defaults tool spans to a tool_request event type", () => {
    const span = recordSpan({
      kind: "tool_use",
      tool_name: "Bash",
      tool_input: { command: "npm test" },
    });

    expect(span.kind).toBe("tool_use");
    expect(span.event_type).toBe("tool_request");
    expect(span.tool_name).toBe("Bash");
  });

  it("keeps caller-supplied ids so children can nest under a parent", () => {
    const parent = recordSpan({ kind: "agent_run" });
    const child = recordSpan({
      trace_id: parent.trace_id,
      session_id: parent.session_id,
      parent_span_id: parent.span_id,
      kind: "tool_use",
    });

    expect(child.trace_id).toBe(parent.trace_id);
    expect(child.session_id).toBe(parent.session_id);
    expect(child.parent_span_id).toBe(parent.span_id);
  });

  it("records error status and payload", () => {
    const span = recordSpan({
      status: "error",
      error: { message: "timed out" },
    });

    expect(span.status).toBe("error");
    expect(span.error).toEqual({ message: "timed out" });
  });

  it("does not buffer while the SDK is disabled", () => {
    configure({ enabled: false });

    expect(isRecording()).toBe(false);
    recordSpan({ model: "gpt-4o" });
    expect(getBufferSize()).toBe(0);
  });
});
