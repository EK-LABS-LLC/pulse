import type OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions";
import { Provider, type ObserveOptions } from "../types";
import { normalizeOpenAIResponse } from "../lib/normalize";
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
 * Wraps the chat.completions.create method to capture traces
 *
 * @param original - The original create method bound to its context
 * @param provider - Provider name ('openai' or 'openrouter')
 * @param options - Trace options (sessionId, metadata)
 * @returns Wrapped function that captures traces
 */
function wrapChatCompletionCreate(
  original: OpenAI.Chat.Completions["create"],
  provider: Provider,
  options?: ObserveOptions
): OpenAI.Chat.Completions["create"] {
  return async function wrappedCreate(
    this: OpenAI.Chat.Completions,
    body: ChatCompletionCreateParamsNonStreaming,
    requestOptions?: Parameters<OpenAI.Chat.Completions["create"]>[1]
  ): Promise<ChatCompletion> {
    if (!isEnabled()) {
      return original.call(this, body, requestOptions) as Promise<ChatCompletion>;
    }

    const startTime = getStartTime();
    const { cleanBody, pulseSessionId, pulseMetadata } = extractPulseParams(
      body as unknown as Record<string, unknown>
    );
    const requestBody = cleanBody;

    const traceMetadata = resolveTraceMetadata(
      { sessionId: options?.sessionId, metadata: options?.metadata },
      pulseSessionId,
      pulseMetadata
    );

    try {
      const response = (await original.call(
        this,
        cleanBody as unknown as typeof body,
        requestOptions
      )) as ChatCompletion;

      const latencyMs = calculateElapsedTime(startTime);

      const normalizedResponse = normalizeOpenAIResponse(response);

      const trace = buildTrace(requestBody, normalizedResponse, provider, latencyMs, traceMetadata);
      addToBuffer(trace);

      return response;
    } catch (error) {
      const latencyMs = calculateElapsedTime(startTime);

      const trace = buildErrorTrace(
        requestBody,
        error instanceof Error ? error : new Error(String(error)),
        provider,
        latencyMs,
        traceMetadata
      );
      addToBuffer(trace);

      throw error;
    }
  } as OpenAI.Chat.Completions["create"];
}

export function patchOpenAI<T extends OpenAI>(
  client: T,
  provider: Provider.OpenAI | Provider.OpenRouter,
  options?: ObserveOptions
): T {
  const originalCreate = client.chat.completions.create.bind(client.chat.completions);

  client.chat.completions.create = wrapChatCompletionCreate(originalCreate, provider, options);

  return client;
}
