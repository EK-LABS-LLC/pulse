import type OpenAI from 'openai';
import type Anthropic from '@anthropic-ai/sdk';
import { type PulseConfig, Provider, type ObserveOptions, type ObservedOpenAI, type ObservedAnthropic } from './types';
import { loadConfig } from './core/config';
import { setConfig, startFlushInterval, flushBuffer, stopFlushInterval, isEnabled } from './core/state';
import { patchOpenAI } from './providers/openai';
import { patchAnthropic } from './providers/anthropic';

let shutdownRegistered = false;

export function initPulse(config: PulseConfig): void {
  const resolvedConfig = loadConfig(config);
  setConfig(resolvedConfig);

  startFlushInterval();

  if (!shutdownRegistered) {
    shutdownRegistered = true;
    let isShuttingDown = false;

    const shutdown = async (signal: string) => {
      if (isShuttingDown || !isEnabled()) return;
      isShuttingDown = true;

      try {
        await flushBuffer();
      } catch (error) {
        console.error('Pulse SDK: error during final flush:', error);
      }
      stopFlushInterval();
    };

    process.on('beforeExit', () => shutdown('beforeExit'));
    process.on('SIGINT', async () => { await shutdown('SIGINT'); process.exit(0); });
    process.on('SIGTERM', async () => { await shutdown('SIGTERM'); process.exit(0); });
  }
}

/** Wrap an LLM client to automatically capture traces. */
export function observe<T extends OpenAI>(client: T, provider: Provider, options?: ObserveOptions): ObservedOpenAI<T>;
export function observe<T extends Anthropic>(client: T, provider: Provider, options?: ObserveOptions): ObservedAnthropic<T>;
export function observe<T>(client: T, provider: Provider, options?: ObserveOptions): T;
export function observe<T>(
  client: T,
  provider: Provider,
  options?: ObserveOptions
): T {
  switch (provider) {
    case Provider.OpenAI:
    case Provider.OpenRouter:
      return patchOpenAI(client as unknown as OpenAI, provider, options) as T;
    case Provider.Anthropic:
      return patchAnthropic(client as unknown as Anthropic, options) as T;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export {
  Provider,
};

export type {
  PulseConfig,
  TraceStatus,
  Trace,
  NormalizedResponse,
  ObserveOptions,
  PulseParams,
  ObservedOpenAI,
  ObservedAnthropic,
} from './types';
