export interface PulseConfig {
  apiKey: string;
  apiUrl?: string;
  batchSize?: number;
  flushInterval?: number;
  enabled?: boolean;
}

export enum Provider {
  OpenAI = "openai",
  Anthropic = "anthropic",
  OpenRouter = "openrouter",
}

export type TraceStatus = "success" | "error";
export type SpanSource = "sdk";
export type SpanKind = "llm_call" | "tool_use";

export interface Trace {
  trace_id: string;
  timestamp: string;
  provider: Provider;
  model_requested: string;
  model_used?: string;
  provider_request_id?: string;
  request_body: Record<string, unknown>;
  response_body?: Record<string, unknown>;
  input_tokens?: number;
  output_tokens?: number;
  output_text?: string;
  finish_reason?: string;
  status: TraceStatus;
  error?: Record<string, unknown>;
  cost_cents?: number;
  latency_ms: number;
  session_id?: string;
  metadata?: Record<string, unknown>;
}

export interface Span {
  span_id: string;
  trace_id: string;
  session_id: string;
  parent_span_id?: string;
  timestamp: string;
  duration_ms?: number;
  source: SpanSource;
  kind: SpanKind;
  event_type: "provider_call" | "tool_request" | "tool_result";
  status: TraceStatus;
  tool_use_id?: string;
  tool_name?: string;
  tool_input?: unknown;
  tool_response?: unknown;
  error?: unknown;
  model?: string;
  provider?: string;
  model_used?: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_cents?: number;
  finish_reason?: string;
  output_text?: string;
  provider_request_id?: string;
  metadata?: Record<string, unknown>;
}

export interface OtlpSpanAttribute {
  key: string;
  value: {
    stringValue?: string;
    intValue?: string;
    doubleValue?: number;
    boolValue?: boolean;
  };
}

export interface OtlpSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind?: number;
  startTimeUnixNano: string;
  endTimeUnixNano?: string;
  attributes: OtlpSpanAttribute[];
  status?: { code: number; message?: string };
}

export interface OtlpTracesPayload {
  resourceSpans: Array<{
    resource?: { attributes?: OtlpSpanAttribute[] };
    scopeSpans: Array<{
      scope?: { name?: string; version?: string };
      spans: OtlpSpan[];
    }>;
  }>;
}

export interface NormalizedResponse {
  content: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  finishReason: string | null;
  model: string;
  costCents?: number;
  /** Provider-assigned response id (e.g. chatcmpl-..., msg_...). */
  id?: string;
}

export interface ObserveOptions {
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface PulseParams {
  pulseSessionId?: string;
  pulseMetadata?: Record<string, unknown>;
}

export type ObservedOpenAI<T extends import("openai").default = import("openai").default> = Omit<
  T,
  "chat" | "responses"
> & {
  chat: Omit<T["chat"], "completions"> & {
    completions: Omit<T["chat"]["completions"], "create"> & {
      create: {
        (
          body: import("openai").default.ChatCompletionCreateParamsNonStreaming & PulseParams,
          options?: import("openai").default.RequestOptions
        ): Promise<import("openai").default.Chat.ChatCompletion>;
        (
          body: import("openai").default.ChatCompletionCreateParamsStreaming & PulseParams,
          options?: import("openai").default.RequestOptions
        ): Promise<
          import("openai/streaming").Stream<import("openai").default.Chat.ChatCompletionChunk>
        >;
      };
    };
  };
  responses: Omit<T["responses"], "create"> & {
    create: {
      (
        body: import("openai").default.Responses.ResponseCreateParamsNonStreaming & PulseParams,
        options?: import("openai").default.RequestOptions
      ): Promise<import("openai").default.Responses.Response>;
      (
        body: import("openai").default.Responses.ResponseCreateParamsStreaming & PulseParams,
        options?: import("openai").default.RequestOptions
      ): Promise<
        import("openai/streaming").Stream<
          import("openai").default.Responses.ResponseStreamEvent
        >
      >;
    };
  };
};

export type ObservedAnthropic<
  T extends import("@anthropic-ai/sdk").default = import("@anthropic-ai/sdk").default,
> = Omit<T, "messages"> & {
  messages: Omit<T["messages"], "create"> & {
    create: {
      (
        body: import("@anthropic-ai/sdk").default.MessageCreateParamsNonStreaming & PulseParams,
        options?: import("@anthropic-ai/sdk").default.RequestOptions
      ): Promise<import("@anthropic-ai/sdk").default.Message>;
      (
        body: import("@anthropic-ai/sdk").default.MessageCreateParamsStreaming & PulseParams,
        options?: import("@anthropic-ai/sdk").default.RequestOptions
      ): Promise<
        import("@anthropic-ai/sdk/streaming").Stream<
          import("@anthropic-ai/sdk").default.RawMessageStreamEvent
        >
      >;
    };
  };
};
