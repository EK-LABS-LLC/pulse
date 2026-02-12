import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { initPulse, observe, Provider } from "@pulse/sdk";

const PULSE_API_KEY = process.env.PULSE_API_KEY;
const PORT = Number(process.env.TEST_SERVER_PORT || 3001);

if (!PULSE_API_KEY) {
  console.error("PULSE_API_KEY is required");
  process.exit(1);
}

initPulse({
  apiKey: PULSE_API_KEY,
  apiUrl: process.env.PULSE_API_URL || "http://localhost:3000",
  batchSize: 1,
  flushInterval: 1000,
});

const openai = process.env.OPENAI_API_KEY
  ? observe(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), Provider.OpenAI)
  : null;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? observe(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), Provider.Anthropic)
  : null;

type RunOptions = {
  pulseSessionId?: string;
  pulseMetadata?: Record<string, unknown>;
};

async function runOpenAI(options: RunOptions = {}) {
  if (!openai) return { error: "OPENAI_API_KEY not set" };
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: "Say 'test' and nothing else" }],
    max_tokens: 32,
    ...options,
  });
  return { model: response.model, content: response.choices[0]?.message?.content ?? null };
}

async function runAnthropic(options: RunOptions = {}) {
  if (!anthropic) return { error: "ANTHROPIC_API_KEY not set" };
  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022",
    max_tokens: 32,
    messages: [{ role: "user", content: "Say 'test' and nothing else" }],
    ...options,
  });
  const text = response.content.find((c: { type: string }) => c.type === "text");
  return { model: response.model, content: text && "text" in text ? text.text : null };
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({ openai: !!openai, anthropic: !!anthropic });
    }

    if (url.pathname === "/run" && req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as {
        provider?: string;
        pulseSessionId?: string;
        pulseMetadata?: Record<string, unknown>;
      };
      const provider = body.provider;
      const options = {
        pulseSessionId: body.pulseSessionId,
        pulseMetadata: body.pulseMetadata,
      };

      try {
        if (provider === "openai") return Response.json(await runOpenAI(options));
        if (provider === "anthropic") return Response.json(await runAnthropic(options));
        return Response.json({
          openai: await runOpenAI(options),
          anthropic: await runAnthropic(options),
        });
      } catch (error) {
        return Response.json(
          { error: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 }
        );
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Test server listening on http://localhost:${server.port}`);
