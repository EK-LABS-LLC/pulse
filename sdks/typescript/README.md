# @eklabs/pulse-sdk

TypeScript SDK for instrumenting LLM clients and capturing traces to your Pulse server.

## Installation

```bash
bun add @eklabs/pulse-sdk
```

## Quick Start

```typescript
import { initPulse, observe } from '@eklabs/pulse-sdk';
import OpenAI from 'openai';

// Initialize SDK
initPulse({
  apiKey: 'pulse_sk_your_api_key',
  apiUrl: 'http://localhost:3000', // Your Pulse server
});

// Wrap your LLM client
const openai = observe(new OpenAI());

// Use as normal - traces are captured automatically
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

## Creating API Keys for Local Testing

The SDK needs a `pulse_sk_…` API key issued by your local trace-service admin endpoint.

1. Start the trace-service (for example via `make sdk-test-e2e`, which launches the docker stack on port 3000).
2. Export the admin key that service expects (the docker compose stack uses `test-admin-key` by default).
3. Run the helper target to create a project + key:

```bash
cd /Users/davontaejackson/dev/pulse
ADMIN_KEY=test-admin-key \
PROJECT_NAME="Pulse SDK Dev" \
make sdk-create-api-key
```

This calls `sdk/scripts/create-api-key.ts`, which POSTs to `TRACE_SERVICE_URL` (default `http://localhost:3000/admin/projects`) and prints the project ID plus plaintext key. You can also invoke the script directly:

```bash
cd /Users/davontaejackson/dev/pulse/sdk
ADMIN_KEY=test-admin-key TRACE_SERVICE_URL=http://localhost:3000 \
bun run scripts/create-api-key.ts "Pulse SDK Dev"
```

Copy the resulting key into `PULSE_API_KEY` before running the SDK or e2e tests.

### Default Local URLs

- `TRACE_SERVICE_URL` defaults to `http://localhost:3000`.
- `TEST_SERVER_URL` defaults to `http://localhost:3001` when you run `bun run tests/test-server.ts` locally. Adjust `TEST_SERVER_PORT` if you need a different port.

## Supported Providers

### OpenAI

```typescript
import OpenAI from 'openai';

const openai = observe(new OpenAI());

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### Anthropic

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = observe(new Anthropic());

const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### OpenRouter

OpenRouter uses the OpenAI client with a custom base URL:

```typescript
import OpenAI from 'openai';

const openrouter = observe(
  new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  })
);

const response = await openrouter.chat.completions.create({
  model: 'anthropic/claude-3.5-sonnet',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

The SDK auto-detects OpenRouter when the base URL contains 'openrouter'.

## Configuration

```typescript
initPulse({
  // Required
  apiKey: 'pulse_sk_your_api_key',

  // Optional
  apiUrl: 'http://localhost:3000', // Pulse server URL
  batchSize: 10,                   // Traces per batch (1-100)
  flushInterval: 5000,             // Flush interval in ms (min: 1000)
  enabled: true,                   // Enable/disable tracing
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | Required | API key (must start with `pulse_sk_`) |
| `apiUrl` | `string` | `http://localhost:3000` | Pulse server URL |
| `batchSize` | `number` | `10` | Number of traces to batch before sending |
| `flushInterval` | `number` | `5000` | Milliseconds between automatic flushes |
| `enabled` | `boolean` | `true` | Enable or disable trace capture |

## Session Tracking

Group related traces together with session IDs:

```typescript
const openai = observe(new OpenAI(), 'auto', {
  sessionId: 'user-session-123',
});

// All traces from this client will include the session ID
```

## Custom Metadata

Attach additional context to traces:

```typescript
const openai = observe(new OpenAI(), 'auto', {
  sessionId: 'conversation-456',
  metadata: {
    userId: 'user-789',
    feature: 'chat',
    environment: 'production',
  },
});
```

## Provider Detection

The SDK automatically detects the provider from the client:

```typescript
// Auto-detection (default)
const client = observe(new OpenAI());

// Explicit provider
const client = observe(new OpenAI(), 'openai');
const client = observe(new Anthropic(), 'anthropic');
```

## Graceful Shutdown

The SDK automatically flushes remaining traces on process exit (SIGINT, SIGTERM). No manual cleanup is required.

## Captured Data

Each trace includes:

- Request and response bodies
- Model requested and used
- Token counts (input/output)
- Latency in milliseconds
- Cost in cents (when available)
- Status (success/error)
- Finish reason
- Session ID and metadata (if provided)

## Error Handling

The SDK captures errors without affecting your application:

```typescript
try {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello!' }],
  });
} catch (error) {
  // Error trace is captured automatically
  // Original error is re-thrown
}
```

## Types

```typescript
import type {
  PulseConfig,
  Provider,
  Trace,
  TraceStatus,
  ObserveOptions,
} from '@eklabs/pulse-sdk';
```
