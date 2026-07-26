import type OpenAI from "openai";
import type { Stream } from "openai/streaming";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from "openai/resources/chat/completions";
import { Provider, type ObserveOptions } from "../types";
import { normalizeOpenAIResponse } from "../lib/normalize";
import {
  getStartTime,
  calculateElapsedTime,
  extractPulseParams,
  resolveTraceMetadata,
} from "./base";
import { addToBuffer, isEnabled } from "../core/state";
import { generateUUID } from "../lib/uuid";
import { generateTraceId } from "../lib/ids";
import {
  buildProviderSpan,
  buildToolRequestSpans,
  buildToolResultSpans,
  correlateToolResults,
  extractOpenAIChatToolCalls,
  extractOpenAIChatToolResults,
  extractOpenAIResponseToolCalls,
  extractOpenAIResponseToolResults,
  resolveSessionId,
} from "./sdk-spans";

interface ChatStreamAccumulator {
  id?: string;
  model?: string;
  content: string;
  inputTokens: number | null;
  outputTokens: number | null;
  finishReason: string | null;
  toolCalls: Map<number, { id?: string; name?: string; arguments: string }>;
}

function createChatStreamAccumulator(): ChatStreamAccumulator {
  return {
    content: "",
    inputTokens: null,
    outputTokens: null,
    finishReason: null,
    toolCalls: new Map(),
  };
}

function processChatChunk(chunk: ChatCompletionChunk, acc: ChatStreamAccumulator): void {
  acc.id = chunk.id ?? acc.id;
  acc.model = chunk.model ?? acc.model;
  acc.inputTokens = chunk.usage?.prompt_tokens ?? acc.inputTokens;
  acc.outputTokens = chunk.usage?.completion_tokens ?? acc.outputTokens;

  for (const choice of chunk.choices ?? []) {
    acc.finishReason = choice.finish_reason ?? acc.finishReason;
    const delta = choice.delta;
    if (typeof delta.content === "string") {
      acc.content += delta.content;
    }
    for (const toolDelta of delta.tool_calls ?? []) {
      const index = toolDelta.index ?? acc.toolCalls.size;
      const existing = acc.toolCalls.get(index) ?? { arguments: "" };
      existing.id = toolDelta.id ?? existing.id;
      existing.name = toolDelta.function?.name ?? existing.name;
      existing.arguments += toolDelta.function?.arguments ?? "";
      acc.toolCalls.set(index, existing);
    }
  }
}

function chatAccumulatorToResponse(acc: ChatStreamAccumulator): ChatCompletion {
  return {
    id: acc.id ?? "",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: acc.model ?? "unknown",
    choices: [
      {
        index: 0,
        finish_reason: acc.finishReason,
        logprobs: null,
        message: {
          role: "assistant",
          content: acc.content || null,
          refusal: null,
          tool_calls: [...acc.toolCalls.values()]
            .filter((call) => call.id)
            .map((call) => ({
              id: call.id!,
              type: "function",
              function: {
                name: call.name ?? "",
                arguments: call.arguments,
              },
            })),
        },
      },
    ],
    usage:
      acc.inputTokens !== null || acc.outputTokens !== null
        ? {
            prompt_tokens: acc.inputTokens ?? 0,
            completion_tokens: acc.outputTokens ?? 0,
            total_tokens: (acc.inputTokens ?? 0) + (acc.outputTokens ?? 0),
          }
        : undefined,
  } as ChatCompletion;
}

function createTracedChatStream(
  originalStream: Stream<ChatCompletionChunk>,
  args: {
    provider: Provider;
    clientId: string;
    requestBody: Record<string, unknown>;
    traceId: string;
    sessionId: string;
    startTime: number;
    startedAt: string;
    metadata?: Record<string, unknown>;
  },
): Stream<ChatCompletionChunk> {
  const accumulator = createChatStreamAccumulator();
  let recorded = false;

  async function* tracingIterator(): AsyncGenerator<ChatCompletionChunk, void, unknown> {
    try {
      for await (const chunk of originalStream) {
        processChatChunk(chunk, accumulator);
        yield chunk;
      }
      if (!recorded) {
        recorded = true;
        recordProviderAndTools(args, chatAccumulatorToResponse(accumulator), calculateElapsedTime(args.startTime));
      }
    } catch (error) {
      if (!recorded) {
        recorded = true;
        recordProviderError(args, error, calculateElapsedTime(args.startTime));
      }
      throw error;
    }
  }

  return new Proxy(originalStream, {
    get(target, prop, receiver) {
      if (prop === Symbol.asyncIterator) return () => tracingIterator();
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function recordProviderAndTools(
  args: {
    provider: Provider;
    clientId: string;
    requestBody: Record<string, unknown>;
    traceId: string;
    sessionId: string;
    startedAt: string;
    metadata?: Record<string, unknown>;
  },
  response: ChatCompletion,
  latencyMs: number,
): void {
  const normalizedResponse = normalizeOpenAIResponse(response);
  const providerSpan = buildProviderSpan({
    traceId: args.traceId,
    sessionId: args.sessionId,
    provider: args.provider,
    request: args.requestBody,
    response: normalizedResponse,
    startedAt: args.startedAt,
    latencyMs,
    status: "success",
    metadata: args.metadata,
  });
  addToBuffer(providerSpan);

  const toolRequestSpans = buildToolRequestSpans({
    provider: args.provider,
    clientId: args.clientId,
    traceId: args.traceId,
    sessionId: args.sessionId,
    parentSpanId: providerSpan.span_id,
    toolCalls: extractOpenAIChatToolCalls(response),
  });
  for (const span of toolRequestSpans) addToBuffer(span);
}

function recordProviderError(
  args: {
    provider: Provider;
    requestBody: Record<string, unknown>;
    traceId: string;
    sessionId: string;
    startedAt: string;
    metadata?: Record<string, unknown>;
  },
  error: unknown,
  latencyMs: number,
): void {
  addToBuffer(
    buildProviderSpan({
      traceId: args.traceId,
      sessionId: args.sessionId,
      provider: args.provider,
      request: args.requestBody,
      response: null,
      startedAt: args.startedAt,
      latencyMs,
      status: "error",
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : { message: String(error) },
      metadata: args.metadata,
    }),
  );
}

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
  clientId: string,
  options?: ObserveOptions
): OpenAI.Chat.Completions["create"] {
  return async function wrappedCreate(
    this: OpenAI.Chat.Completions,
    body: ChatCompletionCreateParamsNonStreaming | ChatCompletionCreateParamsStreaming,
    requestOptions?: Parameters<OpenAI.Chat.Completions["create"]>[1]
  ): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
    if (!isEnabled()) {
      return original.call(this, body, requestOptions) as Promise<ChatCompletion>;
    }

    const startTime = getStartTime();
    const startedAt = new Date().toISOString();
    const { cleanBody, pulseSessionId, pulseMetadata } = extractPulseParams(
      body as unknown as Record<string, unknown>
    );
    const requestBody = cleanBody;

    const traceMetadata = resolveTraceMetadata(
      { sessionId: options?.sessionId, metadata: options?.metadata },
      pulseSessionId,
      pulseMetadata
    );
    const sessionId = resolveSessionId(traceMetadata.sessionId, clientId);
    const results = extractOpenAIChatToolResults(requestBody);
    const correlation = correlateToolResults(provider, clientId, sessionId, results);
    const traceId = correlation.traceId ?? generateTraceId();
    // Tool results were produced before this request, so record them up front
    // rather than after the provider responds.
    for (const span of buildToolResultSpans({ traceId, sessionId, matches: correlation.matches })) {
      addToBuffer(span);
    }
    const callArgs = {
      provider,
      clientId,
      requestBody,
      traceId,
      sessionId,
      startTime,
      startedAt,
      metadata: traceMetadata.metadata,
    };

    try {
      const response = (await original.call(
        this,
        cleanBody as unknown as typeof body,
        requestOptions
      )) as ChatCompletion | Stream<ChatCompletionChunk>;

      if ("stream" in body && body.stream === true) {
        return createTracedChatStream(response as Stream<ChatCompletionChunk>, callArgs);
      }

      recordProviderAndTools(callArgs, response as ChatCompletion, calculateElapsedTime(startTime));
      return response;
    } catch (error) {
      recordProviderError(callArgs, error, calculateElapsedTime(startTime));
      throw error;
    }
  } as OpenAI.Chat.Completions["create"];
}

type ResponsesCreateFn = (
  body: Record<string, unknown>,
  requestOptions?: unknown,
) => Promise<unknown>;

function wrapResponsesCreate(
  original: ResponsesCreateFn,
  provider: Provider,
  clientId: string,
  options?: ObserveOptions,
): ResponsesCreateFn {
  return async function wrappedResponsesCreate(this: unknown, body: Record<string, unknown>, requestOptions?: unknown) {
    if (!isEnabled()) return original.call(this, body, requestOptions);

    const startTime = getStartTime();
    const startedAt = new Date().toISOString();
    const { cleanBody, pulseSessionId, pulseMetadata } = extractPulseParams(body);
    const requestBody = cleanBody;
    const traceMetadata = resolveTraceMetadata(
      { sessionId: options?.sessionId, metadata: options?.metadata },
      pulseSessionId,
      pulseMetadata,
    );
    const sessionId = resolveSessionId(traceMetadata.sessionId, clientId);
    const correlation = correlateToolResults(
      provider,
      clientId,
      sessionId,
      extractOpenAIResponseToolResults(requestBody),
    );
    const traceId = correlation.traceId ?? generateTraceId();
    // Tool results were produced before this request, so record them up front
    // rather than after the provider responds.
    for (const span of buildToolResultSpans({ traceId, sessionId, matches: correlation.matches })) {
      addToBuffer(span);
    }

    try {
      const response = await original.call(this, cleanBody, requestOptions);
      if (cleanBody.stream === true && isAsyncIterable(response)) {
        return createTracedResponsesStream(response, {
          provider,
          clientId,
          requestBody,
          traceId,
          sessionId,
          startTime,
          startedAt,
          metadata: traceMetadata.metadata,
        });
      }
      const latencyMs = calculateElapsedTime(startTime);
      const normalized = normalizeResponsesResponse(response, requestBody);
      const providerSpan = buildProviderSpan({
        traceId,
        sessionId,
        provider,
        request: requestBody,
        response: normalized,
        startedAt,
        latencyMs,
        status: "success",
        metadata: traceMetadata.metadata,
      });
      addToBuffer(providerSpan);
      for (const span of buildToolRequestSpans({
        provider,
        clientId,
        traceId,
        sessionId,
        parentSpanId: providerSpan.span_id,
        toolCalls: extractOpenAIResponseToolCalls(response),
      })) {
        addToBuffer(span);
      }
      return response;
    } catch (error) {
      addToBuffer(
        buildProviderSpan({
          traceId,
          sessionId,
          provider,
          request: requestBody,
          response: null,
          startedAt,
          latencyMs: calculateElapsedTime(startTime),
          status: "error",
          error: error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) },
          metadata: traceMetadata.metadata,
        }),
      );
      throw error;
    }
  };
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return typeof (value as { [Symbol.asyncIterator]?: unknown })?.[Symbol.asyncIterator] === "function";
}

function normalizeResponsesResponse(response: unknown, requestBody: Record<string, unknown>) {
  const typed = response as {
    id?: unknown;
    output_text?: unknown;
    model?: unknown;
    status?: unknown;
    incomplete_details?: { reason?: unknown };
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  return {
    content: typeof typed.output_text === "string" ? typed.output_text : null,
    inputTokens: typed.usage?.input_tokens ?? null,
    outputTokens: typed.usage?.output_tokens ?? null,
    finishReason:
      typed.status === "incomplete" && typeof typed.incomplete_details?.reason === "string"
        ? typed.incomplete_details.reason
        : typeof typed.status === "string"
          ? typed.status
          : null,
    model: String(typed.model ?? requestBody.model ?? "unknown"),
    ...(typeof typed.id === "string" && typed.id.length > 0 && { id: typed.id }),
  };
}

function createTracedResponsesStream(
  originalStream: AsyncIterable<unknown>,
  args: {
    provider: Provider;
    clientId: string;
    requestBody: Record<string, unknown>;
    traceId: string;
    sessionId: string;
    startTime: number;
    startedAt: string;
    metadata?: Record<string, unknown>;
  },
): AsyncIterable<unknown> {
  const output: unknown[] = [];
  let completedResponse: unknown = null;
  let recorded = false;

  function processEvent(event: unknown): void {
    const typed = event as { type?: string; item?: unknown; response?: unknown; delta?: string };
    if (typed.item) output.push(typed.item);
    if (typed.response) completedResponse = typed.response;
    if (typed.type === "response.output_text.delta" && typeof typed.delta === "string") {
      const existing = completedResponse as { output_text?: string } | null;
      completedResponse = { ...(existing ?? {}), output_text: `${existing?.output_text ?? ""}${typed.delta}` };
    }
  }

  function record(response: unknown): void {
    const normalized = normalizeResponsesResponse(response, args.requestBody);
    const providerSpan = buildProviderSpan({
      traceId: args.traceId,
      sessionId: args.sessionId,
      provider: args.provider,
      request: args.requestBody,
      response: normalized,
      startedAt: args.startedAt,
      latencyMs: calculateElapsedTime(args.startTime),
      status: "success",
      metadata: args.metadata,
    });
    addToBuffer(providerSpan);
    for (const span of buildToolRequestSpans({
      provider: args.provider,
      clientId: args.clientId,
      traceId: args.traceId,
      sessionId: args.sessionId,
      parentSpanId: providerSpan.span_id,
      toolCalls: extractOpenAIResponseToolCalls(response),
    })) {
      addToBuffer(span);
    }
  }

  async function* iterator(): AsyncGenerator<unknown, void, unknown> {
    try {
      for await (const event of originalStream) {
        processEvent(event);
        yield event;
      }
      if (!recorded) {
        recorded = true;
        record(completedResponse ?? { output, model: args.requestBody.model });
      }
    } catch (error) {
      if (!recorded) {
        recorded = true;
        recordProviderError(args, error, calculateElapsedTime(args.startTime));
      }
      throw error;
    }
  }

  return new Proxy(originalStream, {
    get(target, prop, receiver) {
      if (prop === Symbol.asyncIterator) return () => iterator();
      const value = Reflect.get(target as object, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as AsyncIterable<unknown>;
}

export function patchOpenAI<T extends OpenAI>(
  client: T,
  provider: Provider.OpenAI | Provider.OpenRouter,
  options?: ObserveOptions
): T {
  const clientId = generateUUID();
  const originalCreate = client.chat.completions.create.bind(client.chat.completions);

  client.chat.completions.create = wrapChatCompletionCreate(originalCreate, provider, clientId, options);

  const responses = (client as unknown as { responses?: { create?: ResponsesCreateFn } })
    .responses;
  if (responses?.create) {
    responses.create = wrapResponsesCreate(responses.create.bind(responses), provider, clientId, options);
  }

  return client;
}
