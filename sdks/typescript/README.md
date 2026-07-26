# @eklabs/pulse-sdk

Official TypeScript SDK for Pulse trace ingestion. The SDK observes supported LLM clients
and exports calls as OTLP HTTP JSON traces to Pulse (`POST /v1/traces`) — one `llm_call`
span per provider request plus `tool_use` spans for tool calls, carrying provider, model,
token, cost, and session attributes.

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

initPulse({ apiKey: "pulse_sk_..." });

const client = observe(
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  Provider.OpenAI
);

await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello" }],
});
```

## Docs

Full docs: https://www.usepulse.dev/docs/
