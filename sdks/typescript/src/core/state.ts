import type { Trace } from "../types";
import { defaults, type ResolvedConfig } from "./config";
import { sendTraces } from "../transport/http";

let config: ResolvedConfig | null = null;
let traceBuffer: Trace[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

export function setConfig(resolvedConfig: ResolvedConfig): void {
  config = resolvedConfig;
}

export function getConfig(): ResolvedConfig {
  if (!config) {
    throw new Error("Pulse SDK: not initialized. Call initPulse() first.");
  }
  return config;
}

export function isEnabled(): boolean {
  return config?.enabled ?? false;
}

export function addToBuffer(trace: Trace): void {
  if (!isEnabled()) {
    return;
  }

  traceBuffer.push(trace);

  const batchSize = config?.batchSize ?? defaults.batchSize;
  if (traceBuffer.length >= batchSize) {
    flushBuffer().catch(() => {});
  }
}

export function getBufferSize(): number {
  return traceBuffer.length;
}

export async function flushBuffer(): Promise<void> {
  if (!isEnabled()) {
    return;
  }

  const traces = [...traceBuffer];
  if (traces.length === 0) {
    return;
  }

  const cfg = getConfig();

  traceBuffer = [];

  try {
    await sendTraces(cfg.apiUrl, cfg.apiKey, traces);
  } catch (error) {
    console.error("Pulse SDK: failed to flush traces:", error);
  }
}

export function startFlushInterval(): void {
  const cfg = getConfig();

  stopFlushInterval();

  flushTimer = setInterval(() => {
    flushBuffer().catch(() => {});
  }, cfg.flushInterval);
}

export function stopFlushInterval(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

export function isFlushIntervalRunning(): boolean {
  return flushTimer !== null;
}

export function resetState(): void {
  config = null;
  traceBuffer = [];
  stopFlushInterval();
}
