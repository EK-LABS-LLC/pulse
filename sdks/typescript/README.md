# @eklabs/pulse-sdk

TypeScript SDK for sending OpenAI/Anthropic/OpenRouter traces to Pulse.

## Install

```bash
bun add @eklabs/pulse-sdk
# or
npm i @eklabs/pulse-sdk
```

## Quick Start

```ts
import OpenAI from "openai";
import { initPulse, observe, Provider } from "@eklabs/pulse-sdk";

initPulse({
  apiKey: "pulse_sk_...",
  apiUrl: "http://localhost:3000", // optional, defaults to localhost
});

const client = observe(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), Provider.OpenAI);

await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello" }],
});
```

## Supported Providers

- OpenAI
- Anthropic
- OpenRouter (via OpenAI-compatible client)

## Config

```ts
initPulse({
  apiKey: "pulse_sk_...",      // required
  apiUrl: "http://localhost:3000",
  batchSize: 10,
  flushInterval: 5000,
  enabled: true,
});
```

## Per-request Metadata

```ts
await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hi" }],
  pulse_session_id: "session-123",
  pulse_metadata: { feature: "chat" },
});
```

## API

- `initPulse(config)`
- `observe(client, provider?, options?)`
- `flushBuffer()`
- `shutdown()`

The SDK batches traces and flushes automatically on shutdown signals.
