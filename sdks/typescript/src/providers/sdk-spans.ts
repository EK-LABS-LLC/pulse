import { Provider, type NormalizedResponse, type Span } from "../types";
import { generateSpanId } from "../lib/ids";
import { calculateCost } from "../lib/pricing";

const MAX_PAYLOAD_BYTES = 64 * 1024;
const PENDING_TTL_MS = 10 * 60 * 1000;

export interface ToolCall {
  id: string;
  name?: string;
  input?: unknown;
}

export interface ToolResult {
  id: string;
  name?: string;
  response?: unknown;
}

export interface CorrelationMatch {
  result: ToolResult;
  traceId?: string;
  parentSpanId?: string;
  status: "matched" | "orphan";
}

interface PendingTool {
  provider: Provider;
  clientId: string;
  sessionId: string;
  traceId: string;
  toolRequestSpanId: string;
  createdAt: number;
}

const pendingTools = new Map<string, PendingTool>();

function nowIso(): string {
  return new Date().toISOString();
}

function pendingKey(provider: Provider, clientId: string, sessionId: string, toolCallId: string) {
  return `${provider}:${clientId}:${sessionId}:${toolCallId}`;
}

function expirePending(now = Date.now()): void {
  for (const [key, pending] of pendingTools) {
    if (now - pending.createdAt > PENDING_TTL_MS) {
      pendingTools.delete(key);
    }
  }
}

export function resolveSessionId(explicit: string | undefined, fallback: string): string {
  return explicit ?? fallback;
}

export function correlateToolResults(
  provider: Provider,
  clientId: string,
  sessionId: string,
  results: ToolResult[],
): { traceId?: string; matches: CorrelationMatch[] } {
  expirePending();

  const matches = results.map((result): CorrelationMatch => {
    const pending = pendingTools.get(pendingKey(provider, clientId, sessionId, result.id));
    if (!pending) {
      return { result, status: "orphan" };
    }
    pendingTools.delete(pendingKey(provider, clientId, sessionId, result.id));
    return {
      result,
      traceId: pending.traceId,
      parentSpanId: pending.toolRequestSpanId,
      status: "matched",
    };
  });

  const matchedTraceIds = new Set(matches.map((match) => match.traceId).filter(Boolean));
  const traceId =
    matches.length > 0 && matches.every((match) => match.status === "matched") && matchedTraceIds.size === 1
      ? [...matchedTraceIds][0]
      : undefined;

  return { traceId, matches };
}

function truncatePayload(value: unknown): unknown {
  if (value === undefined || value === null) return value;

  let serialized: string;
  try {
    serialized = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    serialized = String(value);
  }

  const bytes = new TextEncoder().encode(serialized).byteLength;
  if (bytes <= MAX_PAYLOAD_BYTES) {
    return value;
  }

  return {
    truncated: true,
    originalBytes: bytes,
    preview: serialized.slice(0, MAX_PAYLOAD_BYTES),
  };
}

export function compactPayload(value: unknown): unknown {
  return truncatePayload(value);
}

/** Byte-caps a string payload, keeping it a string (unlike compactPayload). */
export function truncateString(value: string): string {
  const bytes = new TextEncoder().encode(value);
  if (bytes.byteLength <= MAX_PAYLOAD_BYTES) return value;
  return new TextDecoder().decode(bytes.slice(0, MAX_PAYLOAD_BYTES)).replace(/�+$/, "");
}

function responseCostCents(response: NormalizedResponse): number | undefined {
  // Prefer provider-supplied cost (e.g. OpenRouter includes it directly).
  if (response.costCents !== undefined) return response.costCents;
  if (response.inputTokens === null || response.outputTokens === null) return undefined;
  return calculateCost(response.model, response.inputTokens, response.outputTokens) ?? undefined;
}

export function buildProviderSpan(args: {
  traceId: string;
  sessionId: string;
  provider: Provider;
  request: Record<string, unknown>;
  response: NormalizedResponse | null;
  /** Wall-clock ISO timestamp captured when the provider request started. */
  startedAt: string;
  latencyMs: number;
  status: "success" | "error";
  error?: unknown;
  metadata?: Record<string, unknown>;
}): Span {
  const metadata = {
    ...args.metadata,
    "pulse.provider": args.provider,
    "pulse.request": compactPayload(args.request),
    "pulse.response": compactPayload(args.response),
  };
  const response = args.response;

  return {
    span_id: generateSpanId(),
    trace_id: args.traceId,
    session_id: args.sessionId,
    timestamp: args.startedAt,
    duration_ms: args.latencyMs,
    source: "sdk",
    kind: "llm_call",
    event_type: "provider_call",
    status: args.status,
    model: (args.request.model as string | undefined) ?? response?.model,
    provider: args.provider,
    model_used: response?.model,
    input_tokens: response?.inputTokens ?? undefined,
    output_tokens: response?.outputTokens ?? undefined,
    cost_cents: response ? responseCostCents(response) : undefined,
    finish_reason: response?.finishReason ?? undefined,
    output_text: response?.content != null ? truncateString(response.content) : undefined,
    provider_request_id: response?.id,
    error: args.error,
    metadata,
  };
}

export function buildToolResultSpans(args: {
  traceId: string;
  sessionId: string;
  matches: CorrelationMatch[];
}): Span[] {
  return args.matches.map((match) => ({
    span_id: generateSpanId(),
    trace_id: match.traceId ?? args.traceId,
    session_id: args.sessionId,
    parent_span_id: match.parentSpanId,
    timestamp: nowIso(),
    source: "sdk",
    kind: "tool_use",
    event_type: "tool_result",
    status: "success",
    tool_use_id: match.result.id,
    tool_name: match.result.name,
    tool_response: compactPayload(match.result.response),
    metadata: {
      "pulse.correlation.status": match.status,
    },
  }));
}

export function buildToolRequestSpans(args: {
  provider: Provider;
  clientId: string;
  traceId: string;
  sessionId: string;
  parentSpanId: string;
  toolCalls: ToolCall[];
}): Span[] {
  expirePending();

  return args.toolCalls.map((toolCall) => {
    const spanId = generateSpanId();
    pendingTools.set(pendingKey(args.provider, args.clientId, args.sessionId, toolCall.id), {
      provider: args.provider,
      clientId: args.clientId,
      sessionId: args.sessionId,
      traceId: args.traceId,
      toolRequestSpanId: spanId,
      createdAt: Date.now(),
    });

    return {
      span_id: spanId,
      trace_id: args.traceId,
      session_id: args.sessionId,
      parent_span_id: args.parentSpanId,
      timestamp: nowIso(),
      source: "sdk",
      kind: "tool_use",
      event_type: "tool_request",
      status: "success",
      tool_use_id: toolCall.id,
      tool_name: toolCall.name,
      tool_input: compactPayload(toolCall.input),
    };
  });
}

export function extractOpenAIChatToolCalls(response: unknown): ToolCall[] {
  const choices = (response as { choices?: unknown[] }).choices ?? [];
  const calls: ToolCall[] = [];
  for (const choice of choices) {
    const toolCalls = (choice as { message?: { tool_calls?: unknown[] } }).message?.tool_calls ?? [];
    for (const call of toolCalls) {
      const raw = call as { id?: string; function?: { name?: string; arguments?: string } };
      if (!raw.id) continue;
      calls.push({
        id: raw.id,
        name: raw.function?.name,
        input: parseJsonish(raw.function?.arguments),
      });
    }
  }
  return calls;
}

export function extractOpenAIChatToolResults(request: Record<string, unknown>): ToolResult[] {
  const messages = Array.isArray(request.messages) ? request.messages : [];
  return messages
    .filter((message): message is Record<string, unknown> => isRecord(message))
    .filter((message) => message.role === "tool" && typeof message.tool_call_id === "string")
    .map((message) => ({
      id: message.tool_call_id as string,
      response: message.content,
    }));
}

export function extractOpenAIResponseToolCalls(response: unknown): ToolCall[] {
  const output = Array.isArray((response as { output?: unknown[] }).output)
    ? ((response as { output: unknown[] }).output)
    : [];
  const calls: ToolCall[] = [];
  for (const item of output) {
    if (!isRecord(item)) continue;
    if (item.type === "function_call" && typeof item.call_id === "string") {
      calls.push({
        id: item.call_id,
        name: typeof item.name === "string" ? item.name : undefined,
        input: parseJsonish(typeof item.arguments === "string" ? item.arguments : undefined),
      });
    } else if (typeof item.id === "string" && typeof item.type === "string" && item.type.endsWith("_call")) {
      calls.push({
        id: item.id,
        name: item.type,
        input: item,
      });
    }
  }
  return calls;
}

export function extractOpenAIResponseToolResults(request: Record<string, unknown>): ToolResult[] {
  const input = Array.isArray(request.input) ? request.input : [];
  return input
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .filter((item) => item.type === "function_call_output" && typeof item.call_id === "string")
    .map((item) => ({
      id: item.call_id as string,
      response: item.output,
    }));
}

export function extractAnthropicToolCalls(response: unknown): ToolCall[] {
  const content = Array.isArray((response as { content?: unknown[] }).content)
    ? ((response as { content: unknown[] }).content)
    : [];
  return content
    .filter((block): block is Record<string, unknown> => isRecord(block))
    .filter((block) => block.type === "tool_use" && typeof block.id === "string")
    .map((block) => ({
      id: block.id as string,
      name: typeof block.name === "string" ? block.name : undefined,
      input: block.input,
    }));
}

export function extractAnthropicToolResults(request: Record<string, unknown>): ToolResult[] {
  const results: ToolResult[] = [];
  const messages = Array.isArray(request.messages) ? request.messages : [];
  for (const message of messages) {
    if (!isRecord(message)) continue;
    const content = Array.isArray(message.content) ? message.content : [];
    for (const block of content) {
      if (!isRecord(block)) continue;
      if (block.type === "tool_result" && typeof block.tool_use_id === "string") {
        results.push({ id: block.tool_use_id, response: block.content });
      }
    }
  }
  return results;
}

export function parseJsonish(value: string | undefined): unknown {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
