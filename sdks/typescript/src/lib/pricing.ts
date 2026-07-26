/**
 * LLM model pricing utilities
 *
 * Calculates costs for LLM API calls based on token usage.
 * Prices are stored as cents per 1 million tokens for precision.
 *
 * Sources:
 * - OpenAI: https://openai.com/api/pricing/
 * - Anthropic: https://www.anthropic.com/pricing
 */

/**
 * Pricing structure for a model
 */
interface ModelPricing {
  /** Cost in cents per 1 million input tokens */
  inputCentsPer1M: number;
  /** Cost in cents per 1 million output tokens */
  outputCentsPer1M: number;
}

/**
 * Model pricing map
 *
 * All prices in cents per 1 million tokens.
 * Last updated: January 2025
 *
 * OpenAI pricing: https://openai.com/api/pricing/
 * Anthropic pricing: https://www.anthropic.com/pricing
 */
const MODEL_PRICING: Record<string, ModelPricing> = {
  // GPT-5 family (OpenAI)
  "gpt-5.1": { inputCentsPer1M: 125, outputCentsPer1M: 1000 },
  "gpt-5": { inputCentsPer1M: 150, outputCentsPer1M: 1000 },
  "gpt-5-mini": { inputCentsPer1M: 90, outputCentsPer1M: 400 },
  "gpt-5-nano": { inputCentsPer1M: 20, outputCentsPer1M: 100 },
  "gpt-5.1-chat-latest": { inputCentsPer1M: 125, outputCentsPer1M: 1000 },
  "gpt-5-chat-latest": { inputCentsPer1M: 150, outputCentsPer1M: 1000 },
  "gpt-5.1-codex-max": { inputCentsPer1M: 250, outputCentsPer1M: 1250 },
  "gpt-5.1-codex": { inputCentsPer1M: 125, outputCentsPer1M: 600 },
  "gpt-5-codex": { inputCentsPer1M: 145, outputCentsPer1M: 600 },
  "gpt-5.1-codex-mini": { inputCentsPer1M: 40, outputCentsPer1M: 160 },
  "codex-mini-latest": { inputCentsPer1M: 40, outputCentsPer1M: 160 },
  "gpt-5-pro": { inputCentsPer1M: 250, outputCentsPer1M: 1200 },
  "gpt-5-search-api": { inputCentsPer1M: 400, outputCentsPer1M: 1600 },

  // GPT-4.1 / 4o generations
  "gpt-4.1": { inputCentsPer1M: 250, outputCentsPer1M: 1000 },
  "gpt-4.1-mini": { inputCentsPer1M: 100, outputCentsPer1M: 400 },
  "gpt-4.1-nano": { inputCentsPer1M: 15, outputCentsPer1M: 60 },
  "gpt-4o": { inputCentsPer1M: 250, outputCentsPer1M: 1000 },
  "gpt-4o-2024-05-13": { inputCentsPer1M: 250, outputCentsPer1M: 1000 },
  "gpt-4o-mini": { inputCentsPer1M: 15, outputCentsPer1M: 60 },
  "gpt-4o-mini-search-preview": { inputCentsPer1M: 500, outputCentsPer1M: 2000 },
  "gpt-4o-search-preview": { inputCentsPer1M: 1000, outputCentsPer1M: 4000 },

  // Realtime + audio variants
  "gpt-realtime": { inputCentsPer1M: 500, outputCentsPer1M: 2000 },
  "gpt-realtime-mini": { inputCentsPer1M: 250, outputCentsPer1M: 1000 },
  "gpt-4o-realtime-preview": { inputCentsPer1M: 500, outputCentsPer1M: 2000 },
  "gpt-4o-mini-realtime-preview": { inputCentsPer1M: 15, outputCentsPer1M: 60 },
  "gpt-audio": { inputCentsPer1M: 250, outputCentsPer1M: 1000 },
  "gpt-audio-mini": { inputCentsPer1M: 60, outputCentsPer1M: 250 },
  "gpt-4o-audio-preview": { inputCentsPer1M: 250, outputCentsPer1M: 1000 },
  "gpt-4o-mini-audio-preview": { inputCentsPer1M: 15, outputCentsPer1M: 60 },

  // Reasoning / “o” series
  o1: { inputCentsPer1M: 1500, outputCentsPer1M: 6000 },
  "o1-pro": { inputCentsPer1M: 1800, outputCentsPer1M: 7200 },
  "o1-mini": { inputCentsPer1M: 350, outputCentsPer1M: 1400 },
  "o3-pro": { inputCentsPer1M: 1500, outputCentsPer1M: 6000 },
  o3: { inputCentsPer1M: 600, outputCentsPer1M: 2400 },
  "o3-mini": { inputCentsPer1M: 200, outputCentsPer1M: 800 },
  "o3-deep-research": { inputCentsPer1M: 2500, outputCentsPer1M: 10000 },
  "o4-mini": { inputCentsPer1M: 300, outputCentsPer1M: 1200 },
  "o4-mini-deep-research": { inputCentsPer1M: 500, outputCentsPer1M: 2000 },

  // Other OpenAI APIs
  "computer-use-preview": { inputCentsPer1M: 500, outputCentsPer1M: 0 },
  "gpt-image-1": { inputCentsPer1M: 5000, outputCentsPer1M: 0 },
  "gpt-image-1-mini": { inputCentsPer1M: 2000, outputCentsPer1M: 0 },

  // Legacy OpenAI (still supported in the SDK)
  "gpt-4-turbo": { inputCentsPer1M: 1000, outputCentsPer1M: 3000 },
  "gpt-3.5-turbo": { inputCentsPer1M: 50, outputCentsPer1M: 150 },

  // Anthropic models
  "claude-opus-4-5-20251101": { inputCentsPer1M: 500, outputCentsPer1M: 2500 },
  "claude-opus-4-1-20250805": { inputCentsPer1M: 1500, outputCentsPer1M: 7500 },
  "claude-opus-4-20250514": { inputCentsPer1M: 1500, outputCentsPer1M: 7500 },
  "claude-sonnet-4-5-20250929": { inputCentsPer1M: 300, outputCentsPer1M: 1500 },
  "claude-sonnet-4-20250514": { inputCentsPer1M: 300, outputCentsPer1M: 1500 },
  "claude-3-7-sonnet-20250219": { inputCentsPer1M: 300, outputCentsPer1M: 1500 },
  "claude-3-sonnet-20240229": { inputCentsPer1M: 300, outputCentsPer1M: 1500 },
  "claude-3-sonnet-latest": { inputCentsPer1M: 300, outputCentsPer1M: 1500 },
  "claude-3-5-sonnet-20241022": { inputCentsPer1M: 300, outputCentsPer1M: 1500 },
  "claude-3-5-sonnet-latest": { inputCentsPer1M: 300, outputCentsPer1M: 1500 },
  "claude-haiku-4-5-20251001": { inputCentsPer1M: 100, outputCentsPer1M: 500 },
  "claude-3-5-haiku-20241022": { inputCentsPer1M: 80, outputCentsPer1M: 400 },
  "claude-3-5-haiku-latest": { inputCentsPer1M: 80, outputCentsPer1M: 400 },
  "claude-3-haiku-20240307": { inputCentsPer1M: 25, outputCentsPer1M: 125 },
  "claude-3-opus-20240229": { inputCentsPer1M: 1500, outputCentsPer1M: 7500 },
  "claude-3-opus-latest": { inputCentsPer1M: 1500, outputCentsPer1M: 7500 },
};

/**
 * Model name aliases for flexible matching
 *
 * Maps common short names or variations to their canonical pricing entries.
 */
const MODEL_ALIASES: Record<string, string> = {
  // OpenAI aliases (date/version variants)
  "gpt-5.1-latest": "gpt-5.1",
  "gpt-5-latest": "gpt-5",
  "gpt-5-mini-latest": "gpt-5-mini",
  "gpt-5-nano-latest": "gpt-5-nano",
  "gpt-5.1-codex-latest": "gpt-5.1-codex",
  "gpt-5-codex-latest": "gpt-5-codex",
  "gpt-5.1-codex-mini-latest": "gpt-5.1-codex-mini",
  "gpt-4.1-latest": "gpt-4.1",
  "gpt-4.1-mini-latest": "gpt-4.1-mini",
  "gpt-4.1-nano-latest": "gpt-4.1-nano",
  "gpt-4o-2024-11-20": "gpt-4o",
  "gpt-4o-2024-08-06": "gpt-4o",
  "gpt-4o-2024-05-13": "gpt-4o",
  "gpt-4o-mini-2024-07-18": "gpt-4o-mini",
  "gpt-4-turbo-2024-04-09": "gpt-4-turbo",
  "gpt-4-turbo-preview": "gpt-4-turbo",
  "gpt-3.5-turbo-0125": "gpt-3.5-turbo",
  "gpt-3.5-turbo-1106": "gpt-3.5-turbo",

  // Anthropic aliases (short names)
  "claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
  "claude-3.5-sonnet": "claude-3-5-sonnet-20241022",
  "claude-3-sonnet": "claude-3-sonnet-20240229",
  "claude-3.0-sonnet": "claude-3-sonnet-20240229",
  "claude-3-5-haiku": "claude-3-5-haiku-20241022",
  "claude-3.5-haiku": "claude-3-5-haiku-20241022",
  "claude-3-opus": "claude-3-opus-20240229",
  "claude-opus-4-5": "claude-opus-4-5-20251101",
  "claude-opus-4-5-latest": "claude-opus-4-5-20251101",
  "claude-opus-4.5": "claude-opus-4-5-20251101",
  "claude-opus-4-1": "claude-opus-4-1-20250805",
  "claude-opus-4.1": "claude-opus-4-1-20250805",
  "claude-opus-4": "claude-opus-4-20250514",
  "claude-sonnet-4-5": "claude-sonnet-4-5-20250929",
  "claude-sonnet-4-5-latest": "claude-sonnet-4-5-20250929",
  "claude-sonnet-4": "claude-sonnet-4-20250514",
  "claude-3-7-sonnet": "claude-3-7-sonnet-20250219",
  "claude-3.7-sonnet": "claude-3-7-sonnet-20250219",
  "claude-haiku-4-5": "claude-haiku-4-5-20251001",
  "claude-haiku-4-5-latest": "claude-haiku-4-5-20251001",
  "claude-3-haiku": "claude-3-haiku-20240307",
  "claude-3.0-haiku": "claude-3-haiku-20240307",
};

/**
 * Gets pricing for a model, handling aliases
 */
function getModelPricing(model: string): ModelPricing | null {
  // Direct lookup first
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model];
  }

  // Try alias lookup
  const aliasedModel = MODEL_ALIASES[model];
  if (aliasedModel && MODEL_PRICING[aliasedModel]) {
    return MODEL_PRICING[aliasedModel];
  }

  return null;
}

/**
 * Calculates the cost of an LLM API call in cents
 *
 * @param model - The model name (e.g., 'gpt-4o', 'claude-3-5-sonnet-20241022')
 * @param inputTokens - Number of input/prompt tokens
 * @param outputTokens - Number of output/completion tokens
 * @returns Cost in cents, or null if model pricing is unknown
 *
 * @example
 * ```ts
 * const cost = calculateCost('gpt-4o', 1000, 500);
 * // cost = (1000 * 250 / 1_000_000) + (500 * 1000 / 1_000_000)
 * // cost = 0.25 + 0.5 = 0.75 cents
 * ```
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number | null {
  const pricing = getModelPricing(model);

  if (!pricing) {
    return null;
  }

  const inputCost = (inputTokens * pricing.inputCentsPer1M) / 1_000_000;
  const outputCost = (outputTokens * pricing.outputCentsPer1M) / 1_000_000;

  return inputCost + outputCost;
}

/**
 * Checks if pricing is available for a model
 *
 * @param model - The model name to check
 * @returns true if pricing is available
 */
export function hasPricing(model: string): boolean {
  return getModelPricing(model) !== null;
}
