/**
 * Anthropic client patcher
 *
 * Wraps Anthropic client methods to capture traces for LLM calls.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { Stream } from "@anthropic-ai/sdk/streaming";
import type {
  Message,
  MessageCreateParamsNonStreaming,
  MessageCreateParamsStreaming,
  MessageCreateParamsBase,
  RawMessageStreamEvent,
  RawMessageStartEvent,
  RawMessageDeltaEvent,
  RawContentBlockDeltaEvent,
  TextDelta,
  ContentBlock,
  TextBlock,
  Usage,
} from "@anthropic-ai/sdk/resources/messages";
import { Provider, type ObserveOptions, type NormalizedResponse } from "../types";
import { normalizeAnthropicResponse } from "../lib/normalize";
import {
  buildTrace,
  buildErrorTrace,
  getStartTime,
  calculateElapsedTime,
  extractPulseParams,
  resolveTraceMetadata,
  type TraceMetadata,
} from "./base";
import { addToBuffer, isEnabled } from "../core/state";

/**
 * Stop reason mapping from Anthropic values to normalized values
 */
const ANTHROPIC_STOP_REASON_MAP: Record<string, string> = {
  end_turn: "stop",
  max_tokens: "length",
  stop_sequence: "stop",
  tool_use: "tool_calls",
  pause_turn: "pause",
  refusal: "refusal",
};

/**
 * Accumulator for streaming response data
 */
interface StreamAccumulator {
  id: string | null;
  model: string | null;
  role: "assistant";
  content: ContentBlock[];
  stopReason: string | null;
  stopSequence: string | null;
  usage: Usage | null;
  textContent: string;
}

/**
 * Creates a new stream accumulator for collecting streaming events
 */
function createStreamAccumulator(): StreamAccumulator {
  return {
    id: null,
    model: null,
    role: "assistant",
    content: [],
    stopReason: null,
    stopSequence: null,
    usage: null,
    textContent: "",
  };
}

/**
 * Processes a streaming event and updates the accumulator
 */
function processStreamEvent(event: RawMessageStreamEvent, acc: StreamAccumulator): void {
  switch (event.type) {
    case "message_start": {
      const startEvent = event as RawMessageStartEvent;
      acc.id = startEvent.message.id;
      acc.model = startEvent.message.model;
      acc.usage = startEvent.message.usage;
      break;
    }
    case "content_block_start": {
      // Initialize content block
      acc.content.push(event.content_block);
      break;
    }
    case "content_block_delta": {
      const deltaEvent = event as RawContentBlockDeltaEvent;
      if (deltaEvent.delta.type === "text_delta") {
        const textDelta = deltaEvent.delta as TextDelta;
        acc.textContent += textDelta.text;
        // Update the text block content
        const block = acc.content[deltaEvent.index];
        if (block && block.type === "text") {
          (block as TextBlock).text += textDelta.text;
        }
      }
      break;
    }
    case "message_delta": {
      const messageDelta = event as RawMessageDeltaEvent;
      acc.stopReason = messageDelta.delta.stop_reason;
      acc.stopSequence = messageDelta.delta.stop_sequence;
      // Update usage with delta values
      if (messageDelta.usage) {
        acc.usage = {
          ...acc.usage,
          input_tokens: messageDelta.usage.input_tokens ?? acc.usage?.input_tokens ?? 0,
          output_tokens: messageDelta.usage.output_tokens,
          cache_creation_input_tokens: messageDelta.usage.cache_creation_input_tokens,
          cache_read_input_tokens: messageDelta.usage.cache_read_input_tokens,
          cache_creation: acc.usage?.cache_creation ?? null,
          server_tool_use: messageDelta.usage.server_tool_use,
          service_tier: acc.usage?.service_tier ?? null,
        };
      }
      break;
    }
    // message_stop and content_block_stop don't contain data we need
  }
}

/**
 * Converts accumulated stream data to a NormalizedResponse
 */
function accumulatorToNormalizedResponse(acc: StreamAccumulator): NormalizedResponse {
  // Map stop reason to normalized format
  const finishReason = acc.stopReason
    ? (ANTHROPIC_STOP_REASON_MAP[acc.stopReason] ?? acc.stopReason)
    : null;

  return {
    content: acc.textContent || null,
    inputTokens: acc.usage?.input_tokens ?? null,
    outputTokens: acc.usage?.output_tokens ?? null,
    finishReason,
    model: acc.model ?? "unknown",
  };
}

/**
 * Creates a proxy around the stream that intercepts iteration to capture traces
 *
 * This approach uses a Proxy to intercept the Symbol.asyncIterator call and wrap
 * the iteration behavior while still returning the original Stream object type.
 */
function createTracedStream(
  originalStream: Stream<RawMessageStreamEvent>,
  requestBody: Record<string, unknown>,
  startTime: number,
  traceMetadata: TraceMetadata
): Stream<RawMessageStreamEvent> {
  const accumulator = createStreamAccumulator();
  let traceRecorded = false;

  // Create an async generator that wraps iteration
  async function* tracingIterator(): AsyncGenerator<RawMessageStreamEvent, void, unknown> {
    try {
      for await (const event of originalStream) {
        processStreamEvent(event, accumulator);
        yield event;
      }

      // Stream completed successfully
      if (!traceRecorded) {
        traceRecorded = true;
        const latencyMs = calculateElapsedTime(startTime);
        const normalizedResponse = accumulatorToNormalizedResponse(accumulator);
        const trace = buildTrace(
          requestBody,
          normalizedResponse,
          Provider.Anthropic,
          latencyMs,
          traceMetadata
        );
        addToBuffer(trace);
      }
    } catch (error) {
      // Stream errored
      if (!traceRecorded) {
        traceRecorded = true;
        const latencyMs = calculateElapsedTime(startTime);
        const trace = buildErrorTrace(
          requestBody,
          error instanceof Error ? error : new Error(String(error)),
          Provider.Anthropic,
          latencyMs,
          traceMetadata
        );
        addToBuffer(trace);
      }
      throw error;
    }
  }

  // Create a proxy that intercepts Symbol.asyncIterator
  const handler: ProxyHandler<Stream<RawMessageStreamEvent>> = {
    get(target, prop, receiver) {
      if (prop === Symbol.asyncIterator) {
        // Return our tracing iterator instead of the original
        return () => tracingIterator();
      }
      // For all other properties, use the original
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        return value.bind(target);
      }
      return value;
    },
  };

  return new Proxy(originalStream, handler);
}

/**
 * Wraps the messages.create method to capture traces
 *
 * Handles both non-streaming and streaming responses:
 * - Non-streaming: Captures trace after response is received
 * - Streaming: Wraps the stream to accumulate events and capture trace on completion
 *
 * @param original - The original create method bound to its context
 * @param options - Trace options (sessionId, metadata)
 * @returns Wrapped function that captures traces
 */
function wrapMessagesCreate(
  original: Anthropic.Messages["create"],
  options?: ObserveOptions
): Anthropic.Messages["create"] {
  // Overload 1: Non-streaming
  async function wrappedCreate(
    body: MessageCreateParamsNonStreaming,
    requestOptions?: Parameters<Anthropic.Messages["create"]>[1]
  ): Promise<Message>;
  // Overload 2: Streaming
  async function wrappedCreate(
    body: MessageCreateParamsStreaming,
    requestOptions?: Parameters<Anthropic.Messages["create"]>[1]
  ): Promise<Stream<RawMessageStreamEvent>>;
  // Overload 3: Base (could be either)
  async function wrappedCreate(
    body: MessageCreateParamsBase,
    requestOptions?: Parameters<Anthropic.Messages["create"]>[1]
  ): Promise<Stream<RawMessageStreamEvent> | Message>;
  // Implementation
  async function wrappedCreate(
    body: MessageCreateParamsNonStreaming | MessageCreateParamsStreaming | MessageCreateParamsBase,
    requestOptions?: Parameters<Anthropic.Messages["create"]>[1]
  ): Promise<Message | Stream<RawMessageStreamEvent>> {
    // If SDK is disabled, just call the original method
    if (!isEnabled()) {
      return original(body as MessageCreateParamsBase, requestOptions);
    }

    const startTime = getStartTime();
    const { cleanBody, pulseSessionId, pulseMetadata } = extractPulseParams(
      body as unknown as Record<string, unknown>
    );
    const requestBody = cleanBody;
    const isStreaming = "stream" in body && body.stream === true;

    const traceMetadata = resolveTraceMetadata(
      { sessionId: options?.sessionId, metadata: options?.metadata },
      pulseSessionId,
      pulseMetadata
    );

    if (isStreaming) {
      // Handle streaming response
      try {
        const stream = await original(
          cleanBody as unknown as MessageCreateParamsStreaming,
          requestOptions
        );
        // Return a traced stream that captures events and builds trace on completion
        return createTracedStream(
          stream as Stream<RawMessageStreamEvent>,
          requestBody,
          startTime,
          traceMetadata
        );
      } catch (error) {
        // Calculate latency even on error
        const latencyMs = calculateElapsedTime(startTime);

        // Build error trace
        const trace = buildErrorTrace(
          requestBody,
          error instanceof Error ? error : new Error(String(error)),
          Provider.Anthropic,
          latencyMs,
          traceMetadata
        );
        addToBuffer(trace);

        // Re-throw the original error
        throw error;
      }
    } else {
      // Handle non-streaming response
      try {
        const response = (await original(
          cleanBody as unknown as MessageCreateParamsNonStreaming,
          requestOptions
        )) as Message;

        // Calculate latency
        const latencyMs = calculateElapsedTime(startTime);

        // Normalize response
        const normalizedResponse = normalizeAnthropicResponse(response);

        // Build and buffer trace
        const trace = buildTrace(
          requestBody,
          normalizedResponse,
          Provider.Anthropic,
          latencyMs,
          traceMetadata
        );
        addToBuffer(trace);

        // Return original response unchanged
        return response;
      } catch (error) {
        // Calculate latency even on error
        const latencyMs = calculateElapsedTime(startTime);

        // Build error trace
        const trace = buildErrorTrace(
          requestBody,
          error instanceof Error ? error : new Error(String(error)),
          Provider.Anthropic,
          latencyMs,
          traceMetadata
        );
        addToBuffer(trace);

        // Re-throw the original error
        throw error;
      }
    }
  }

  return wrappedCreate as Anthropic.Messages["create"];
}

/**
 * Patches an Anthropic client to capture traces for LLM calls
 *
 * @param client - The Anthropic client instance to patch
 * @param options - Trace options (sessionId, metadata)
 * @returns The same client instance with methods wrapped for tracing
 *
 * @example
 * ```ts
 * import Anthropic from '@anthropic-ai/sdk';
 * import { patchAnthropic } from '@eklabs/pulse-sdk';
 *
 * const client = new Anthropic({ apiKey: 'sk-ant-...' });
 * patchAnthropic(client);
 *
 * // All calls are now traced
 * const response = await client.messages.create({
 *   model: 'claude-3-5-sonnet-20241022',
 *   max_tokens: 1024,
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * ```
 */
export function patchAnthropic<T extends Anthropic>(client: T, options?: ObserveOptions): T {
  // Store original method
  const originalCreate = client.messages.create.bind(client.messages);

  // Wrap messages.create
  client.messages.create = wrapMessagesCreate(originalCreate, options);

  return client;
}
