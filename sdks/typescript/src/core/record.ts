import type { Span, SpanKind, TraceStatus } from "../types";
import { addToBuffer, isEnabled } from "./state";

export interface RecordSpanInput {
  trace_id?: string;
  session_id?: string;
  span_id?: string;
  parent_span_id?: string;
  timestamp?: string;
  duration_ms?: number;
  kind?: SpanKind;
  event_type?: Span["event_type"];
  status?: TraceStatus;
  tool_use_id?: string;
  tool_name?: string;
  tool_input?: unknown;
  tool_response?: unknown;
  error?: unknown;
  model?: string;
  model_used?: string;
  provider?: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_cents?: number;
  finish_reason?: string;
  output_text?: string;
  provider_request_id?: string;
  metadata?: Record<string, unknown>;
}

function eventTypeFor(kind: SpanKind): Span["event_type"] {
  return kind === "tool_use" ? "tool_request" : "provider_call";
}

/**
 * Records a span the SDK did not produce by wrapping a provider client —
 * an agent step, a tool call, or a turn from a provider with no wrapper.
 *
 * Returns the span as buffered, so callers can chain children off its ids.
 */
export function recordSpan(input: RecordSpanInput = {}): Span {
  const kind = input.kind ?? "llm_call";
  const span: Span = {
    span_id: input.span_id ?? crypto.randomUUID(),
    trace_id: input.trace_id ?? crypto.randomUUID(),
    session_id: input.session_id ?? crypto.randomUUID(),
    parent_span_id: input.parent_span_id,
    timestamp: input.timestamp ?? new Date().toISOString(),
    duration_ms: input.duration_ms,
    source: "sdk",
    kind,
    event_type: input.event_type ?? eventTypeFor(kind),
    status: input.status ?? "success",
    tool_use_id: input.tool_use_id,
    tool_name: input.tool_name,
    tool_input: input.tool_input,
    tool_response: input.tool_response,
    error: input.error,
    model: input.model,
    model_used: input.model_used,
    provider: input.provider,
    input_tokens: input.input_tokens,
    output_tokens: input.output_tokens,
    cost_cents: input.cost_cents,
    finish_reason: input.finish_reason,
    output_text: input.output_text,
    provider_request_id: input.provider_request_id,
    metadata: input.metadata,
  };

  addToBuffer(span);
  return span;
}

export function isRecording(): boolean {
  return isEnabled();
}
