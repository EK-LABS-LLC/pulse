import type { PulseConfig } from "../types";

export interface ResolvedConfig {
  apiKey: string;
  apiUrl: string;
  batchSize: number;
  flushInterval: number;
  enabled: boolean;
}

export const defaults = {
  apiUrl: "http://localhost:3000",
  batchSize: 10,
  flushInterval: 5000,
  enabled: true,
} as const;

export function loadConfig(config: PulseConfig): ResolvedConfig {
  if (!config.apiKey) {
    throw new Error("Pulse SDK: apiKey is required");
  }

  if (!config.apiKey.startsWith("pulse_sk_")) {
    throw new Error('Pulse SDK: apiKey must start with "pulse_sk_"');
  }

  const batchSize = config.batchSize ?? defaults.batchSize;
  if (batchSize < 1 || batchSize > 100) {
    throw new Error("Pulse SDK: batchSize must be between 1 and 100");
  }

  const flushInterval = config.flushInterval ?? defaults.flushInterval;
  if (flushInterval < 1000) {
    throw new Error("Pulse SDK: flushInterval must be at least 1000ms");
  }

  return {
    apiKey: config.apiKey,
    apiUrl: config.apiUrl ?? defaults.apiUrl,
    batchSize,
    flushInterval,
    enabled: config.enabled ?? defaults.enabled,
  };
}
