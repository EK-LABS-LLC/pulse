import type { Trace, Provider, TraceStatus, NormalizedResponse, ObserveOptions } from "../types";
import { generateUUID } from "../lib/uuid";
import { calculateCost } from "../lib/pricing";

export interface TraceMetadata {
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export function extractPulseParams(body: Record<string, unknown>): {
  cleanBody: Record<string, unknown>;
  pulseSessionId?: string;
  pulseMetadata?: Record<string, unknown>;
} {
  const { pulseSessionId, pulseMetadata, ...cleanBody } = body;
  return {
    cleanBody,
    pulseSessionId: pulseSessionId as string | undefined,
    pulseMetadata: pulseMetadata as Record<string, unknown> | undefined,
  };
}

export function resolveTraceMetadata(
  observeOptions?: TraceMetadata,
  pulseSessionId?: string,
  pulseMetadata?: Record<string, unknown>
): TraceMetadata {
  return {
    sessionId: pulseSessionId ?? observeOptions?.sessionId,
    metadata: pulseMetadata
      ? { ...observeOptions?.metadata, ...pulseMetadata }
      : observeOptions?.metadata,
  };
}

/**
 * Calculates elapsed time in milliseconds from a start timestamp
 *
 * @param startTime - High-resolution timestamp from performance.now() or Date.now()
 * @returns Elapsed time in milliseconds
 */
export function calculateElapsedTime(startTime: number): number {
  const endTime = typeof performance !== "undefined" ? performance.now() : Date.now();
  return Math.round(endTime - startTime);
}

/**
 * Gets the current high-resolution timestamp
 * Prefers performance.now() for better precision, falls back to Date.now()
 *
 * @returns Current timestamp in milliseconds
 */
export function getStartTime(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * Builds a trace object from request/response data
 *
 * @param request - The original request body sent to the LLM provider
 * @param response - The normalized response from the LLM provider (null if error)
 * @param provider - The provider name (openai, anthropic, openrouter)
 * @param latencyMs - Request latency in milliseconds
 * @param options - Additional trace options (session ID, metadata)
 * @returns A complete Trace object ready for buffering
 */
export function buildTrace(
  request: Record<string, unknown>,
  response: NormalizedResponse | null,
  provider: Provider,
  latencyMs: number,
  options?: TraceMetadata
): Trace {
  const modelRequested = (request.model as string) ?? "unknown";

  // Calculate cost from response data or use provider-supplied cost
  let costCents: number | undefined;
  if (response) {
    // Prefer provider-supplied cost (e.g., OpenRouter)
    if (response.costCents !== undefined) {
      costCents = response.costCents;
    } else if (response.inputTokens !== null && response.outputTokens !== null) {
      // Calculate cost based on model and token usage
      const calculated = calculateCost(response.model, response.inputTokens, response.outputTokens);
      if (calculated !== null) {
        costCents = calculated;
      }
    }
  }

  const trace: Trace = {
    trace_id: generateUUID(),
    timestamp: new Date().toISOString(),
    provider,
    model_requested: modelRequested,
    model_used: response?.model,
    request_body: request,
    response_body: response ? { ...response } : undefined,
    input_tokens: response?.inputTokens ?? undefined,
    output_tokens: response?.outputTokens ?? undefined,
    output_text: response?.content ?? undefined,
    finish_reason: response?.finishReason ?? undefined,
    status: response ? "success" : "error",
    latency_ms: latencyMs,
    cost_cents: costCents,
    session_id: options?.sessionId,
    metadata: options?.metadata,
  };

  return trace;
}

/**
 * Builds a trace object for an error response
 *
 * @param request - The original request body sent to the LLM provider
 * @param error - The error that occurred
 * @param provider - The provider name (openai, anthropic, openrouter)
 * @param latencyMs - Request latency in milliseconds
 * @param options - Additional trace options (session ID, metadata)
 * @returns A complete Trace object with error details
 */
export function buildErrorTrace(
  request: Record<string, unknown>,
  error: Error,
  provider: Provider,
  latencyMs: number,
  options?: TraceMetadata
): Trace {
  const modelRequested = (request.model as string) ?? "unknown";

  const trace: Trace = {
    trace_id: generateUUID(),
    timestamp: new Date().toISOString(),
    provider,
    model_requested: modelRequested,
    request_body: request,
    status: "error",
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    latency_ms: latencyMs,
    session_id: options?.sessionId,
    metadata: options?.metadata,
  };

  return trace;
}
