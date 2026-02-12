export interface PulseConfig {
  apiKey: string;
  apiUrl?: string;
  batchSize?: number;
  flushInterval?: number;
  enabled?: boolean;
}

export enum Provider {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  OpenRouter = 'openrouter',
}

export type TraceStatus = 'success' | 'error';

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

export interface NormalizedResponse {
  content: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  finishReason: string | null;
  model: string;
  costCents?: number;
}

export interface ObserveOptions {
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface PulseParams {
  pulseSessionId?: string;
  pulseMetadata?: Record<string, unknown>;
}

export type ObservedOpenAI<T extends import('openai').default = import('openai').default> = Omit<T, 'chat'> & {
  chat: Omit<T['chat'], 'completions'> & {
    completions: Omit<T['chat']['completions'], 'create'> & {
      create: {
        (
          body: import('openai').default.ChatCompletionCreateParamsNonStreaming & PulseParams,
          options?: import('openai').default.RequestOptions
        ): Promise<import('openai').default.Chat.ChatCompletion>;
        (
          body: import('openai').default.ChatCompletionCreateParamsStreaming & PulseParams,
          options?: import('openai').default.RequestOptions
        ): Promise<import('openai/streaming').Stream<import('openai').default.Chat.ChatCompletionChunk>>;
      };
    };
  };
};

export type ObservedAnthropic<T extends import('@anthropic-ai/sdk').default = import('@anthropic-ai/sdk').default> = Omit<T, 'messages'> & {
  messages: Omit<T['messages'], 'create'> & {
    create: {
      (
        body: import('@anthropic-ai/sdk').default.MessageCreateParamsNonStreaming & PulseParams,
        options?: import('@anthropic-ai/sdk').default.RequestOptions
      ): Promise<import('@anthropic-ai/sdk').default.Message>;
      (
        body: import('@anthropic-ai/sdk').default.MessageCreateParamsStreaming & PulseParams,
        options?: import('@anthropic-ai/sdk').default.RequestOptions
      ): Promise<import('@anthropic-ai/sdk/streaming').Stream<import('@anthropic-ai/sdk').default.RawMessageStreamEvent>>;
    };
  };
};
