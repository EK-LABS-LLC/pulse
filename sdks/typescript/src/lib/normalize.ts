/**
 * Response normalizers for LLM providers
 *
 * Extracts and normalizes response data from OpenAI, Anthropic, and OpenRouter
 * into a unified NormalizedResponse format for trace storage.
 */

import type { NormalizedResponse } from '../types';
import type { ChatCompletion } from 'openai/resources/chat/completions';
import type { Message } from '@anthropic-ai/sdk/resources/messages';

/**
 * Stop reason mapping from provider-specific values to normalized values
 *
 * | Scenario       | OpenAI/OpenRouter | Anthropic       | Normalized To |
 * |----------------|-------------------|-----------------|---------------|
 * | Normal end     | stop              | end_turn        | stop          |
 * | Max tokens     | length            | max_tokens      | length        |
 * | Stop sequence  | stop              | stop_sequence   | stop          |
 * | Tool use       | tool_calls        | tool_use        | tool_calls    |
 */
const ANTHROPIC_STOP_REASON_MAP: Record<string, string> = {
  end_turn: 'stop',
  max_tokens: 'length',
  stop_sequence: 'stop',
  tool_use: 'tool_calls',
};

/**
 * Normalizes an OpenAI chat completion response
 *
 * Works for both OpenAI and OpenRouter since they use compatible response formats.
 * OpenRouter may include additional `cost` field in the response which is extracted.
 *
 * @param response - OpenAI ChatCompletion response object
 * @returns NormalizedResponse with extracted content, tokens, and finish reason
 */
export function normalizeOpenAIResponse(response: ChatCompletion): NormalizedResponse {
  const choice = response.choices[0];
  const usage = response.usage;

  // Extract content from first choice's message
  const content = choice?.message?.content ?? null;

  // Extract token counts from usage object
  // OpenAI uses prompt_tokens/completion_tokens
  const inputTokens = usage?.prompt_tokens ?? null;
  const outputTokens = usage?.completion_tokens ?? null;

  // Finish reason is already in normalized format for OpenAI (stop, length, tool_calls)
  const finishReason = choice?.finish_reason ?? null;

  // Model name from response
  const model = response.model;

  // OpenRouter includes cost in response
  // Cast to access OpenRouter-specific field
  const openRouterResponse = response as ChatCompletion & { cost?: number };
  const costCents = openRouterResponse.cost !== undefined
    ? openRouterResponse.cost * 100 // Convert dollars to cents
    : undefined;

  return {
    content,
    inputTokens,
    outputTokens,
    finishReason,
    model,
    ...(costCents !== undefined && { costCents }),
  };
}

/**
 * Normalizes an Anthropic message response
 *
 * Handles Anthropic's array-based content format and maps stop reasons
 * to the normalized format used internally.
 *
 * @param response - Anthropic Message response object
 * @returns NormalizedResponse with extracted content, tokens, and finish reason
 */
export function normalizeAnthropicResponse(response: Message): NormalizedResponse {
  // Extract and join text content from content blocks
  // Anthropic returns an array of content blocks, we join text blocks
  const textParts: string[] = [];
  for (const block of response.content) {
    if (block.type === 'text') {
      textParts.push(block.text);
    }
  }
  const content = textParts.length > 0 ? textParts.join('') : null;

  // Extract token counts from usage object
  // Anthropic uses input_tokens/output_tokens (already matches our internal naming)
  const inputTokens = response.usage?.input_tokens ?? null;
  const outputTokens = response.usage?.output_tokens ?? null;

  // Map Anthropic stop_reason to normalized finish_reason
  const stopReason = response.stop_reason;
  const finishReason = stopReason
    ? ANTHROPIC_STOP_REASON_MAP[stopReason] ?? stopReason
    : null;

  // Model name from response
  const model = response.model;

  return {
    content,
    inputTokens,
    outputTokens,
    finishReason,
    model,
  };
}
