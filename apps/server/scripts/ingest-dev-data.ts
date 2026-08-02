/**
 * Fills a running server with data by driving the real SDK, so what the
 * dashboard renders is whatever genuinely survives ingestion.
 *
 * Every span goes out through initPulse/recordSpan/flush and the OTLP
 * transport. Nothing here writes to the database or fabricates a response.
 *
 *   bun run scripts/ingest-dev-data.ts
 *
 * Env: PULSE_BASE_URL, PULSE_EMAIL, PULSE_PASSWORD, PULSE_PROJECTS (1-3).
 */
import {
  initPulse,
  recordSpan,
  flush,
  shutdownPulse,
} from "../../../sdks/typescript/src/index";

const BASE_URL = process.env.PULSE_BASE_URL ?? "http://127.0.0.1:3399";
const EMAIL = process.env.PULSE_EMAIL ?? "redesign@pulse.test";
const PASSWORD = process.env.PULSE_PASSWORD ?? "RedesignPass!123";
const PROJECT_COUNT = Math.min(
  Math.max(Number(process.env.PULSE_PROJECTS ?? 2), 1),
  3,
);

interface Project {
  name: string;
  projectId: string;
  apiKey: string;
  serviceName: string;
}

const MODELS = [
  {
    model: "claude-opus-4",
    provider: "anthropic",
    inRate: 0.0015,
    outRate: 0.0075,
  },
  {
    model: "claude-sonnet-4.5",
    provider: "anthropic",
    inRate: 0.0003,
    outRate: 0.0015,
  },
  { model: "gpt-4o", provider: "openai", inRate: 0.00025, outRate: 0.001 },
  {
    model: "gpt-4o-mini",
    provider: "openai",
    inRate: 0.000015,
    outRate: 0.00006,
  },
];

const TOOLS = [
  {
    name: "Read",
    input: { file_path: "src/auth/session.ts" },
    output: { lines: 42 },
  },
  {
    name: "Grep",
    input: { pattern: "expiresAt", path: "src" },
    output: { matches: 6 },
  },
  {
    name: "Edit",
    input: { file_path: "src/auth/session.ts" },
    output: { ok: true },
  },
  {
    name: "Bash",
    input: { command: "bun test" },
    output: { stdout: "42 pass" },
  },
  {
    name: "WebFetch",
    input: { url: "https://example.com/pricing" },
    output: { title: "Pricing" },
  },
  {
    name: "WebSearch",
    input: { query: "otel span attributes" },
    output: { results: 8 },
  },
];

const WORK = [
  "Fix failing auth test and refactor session helper",
  "Add pagination to the sessions list endpoint",
  "Implement rate limiter middleware",
  "Update Dockerfile for multi-stage build",
  "Add unit tests for the billing service",
  "Summarize customer feedback batch",
  "Generate release notes from the commit log",
];

// Deterministic so repeated runs are comparable.
let seed = 20260802;
function rand(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)];
const between = (min: number, max: number) =>
  Math.round(min + rand() * (max - min));

async function api(path: string, init: RequestInit = {}, cookie?: string) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`${path} -> ${response.status}: ${await response.text()}`);
  }
  return response;
}

async function signIn(): Promise<string> {
  await fetch(`${BASE_URL}/dashboard/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Redesign User",
      email: EMAIL,
      password: PASSWORD,
      projectName: "Pulse Dev",
    }),
  });

  const signin = await api("/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  return (signin.headers.get("set-cookie") ?? "").split(";")[0];
}

/**
 * Reuses the projects signup already made rather than adding more, so the
 * dashboard's project switcher stays short and every project holds data.
 */
async function resolveProjects(cookie: string): Promise<Project[]> {
  const names = ["Pulse Dev", "Checkout Agent", "Research Agent"].slice(
    0,
    PROJECT_COUNT,
  );
  const services = ["pulse-api", "checkout-agent", "research-agent"];

  const existing = (await (
    await api("/dashboard/api/projects", {}, cookie)
  ).json()) as { projects: Array<{ id: string; name: string }> };

  const projects: Project[] = [];
  for (const [index, name] of names.entries()) {
    let projectId = existing.projects.find((p) => p.name === name)?.id;
    let apiKey: string | undefined;

    if (!projectId) {
      const created = (await (
        await api(
          "/dashboard/api/projects",
          { method: "POST", body: JSON.stringify({ name }) },
          cookie,
        )
      ).json()) as { projectId: string; apiKey: string };
      projectId = created.projectId;
      apiKey = created.apiKey;
    } else {
      const keys = (await (
        await api(
          "/dashboard/api/api-keys",
          { headers: { "X-Project-Id": projectId } },
          cookie,
        )
      ).json()) as { keys?: Array<{ key?: string }> };
      apiKey = keys.keys?.find((k) => k.key)?.key;
    }

    if (!apiKey) {
      throw new Error(`No usable API key for project "${name}"`);
    }
    projects.push({ name, projectId, apiKey, serviceName: services[index] });
  }
  return projects;
}

function emitTurn(sessionId: string, startedAt: number, isError: boolean) {
  const spec = pick(MODELS);
  const traceId = crypto.randomUUID();
  const toolCount = between(1, 5);
  const agentDuration = between(1200, 9000);

  const agent = recordSpan({
    trace_id: traceId,
    session_id: sessionId,
    kind: "agent_run",
    timestamp: new Date(startedAt).toISOString(),
    duration_ms: agentDuration,
    status: isError ? "error" : "success",
    metadata: { summary: pick(WORK) },
  });

  const inputTokens = between(400, 6000);
  const outputTokens = isError ? 0 : between(80, 1600);
  let cursor = startedAt + between(40, 200);

  recordSpan({
    trace_id: traceId,
    session_id: sessionId,
    parent_span_id: agent.span_id,
    kind: "llm_call",
    timestamp: new Date(cursor).toISOString(),
    duration_ms: between(200, 2400),
    status: "success",
    model: spec.model,
    model_used: spec.model,
    provider: spec.provider,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_cents: inputTokens * spec.inRate + outputTokens * spec.outRate,
    finish_reason: "stop",
    output_text: pick(WORK),
  });

  for (let i = 0; i < toolCount; i++) {
    const tool = pick(TOOLS);
    const failing = isError && i === toolCount - 1;
    cursor += between(120, 900);
    recordSpan({
      trace_id: traceId,
      session_id: sessionId,
      parent_span_id: agent.span_id,
      kind: "tool_use",
      timestamp: new Date(cursor).toISOString(),
      duration_ms: between(60, 1800),
      status: failing ? "error" : "success",
      tool_name: tool.name,
      tool_input: tool.input,
      tool_response: failing ? undefined : tool.output,
      error: failing
        ? { message: `${tool.name} failed: command not found` }
        : undefined,
    });
  }
}

async function main() {
  const cookie = await signIn();
  const projects = await resolveProjects(cookie);
  console.log(`Ingesting through the SDK into ${projects.length} project(s)\n`);

  for (const project of projects) {
    initPulse({
      apiKey: project.apiKey,
      apiUrl: BASE_URL,
      serviceName: project.serviceName,
      batchSize: 100,
      flushInterval: 60000,
    });

    const sessions = between(4, 6);
    let turns = 0;
    for (let s = 0; s < sessions; s++) {
      const sessionId = crypto.randomUUID();
      let at = Date.now() - between(1, 7) * 86400000;
      const turnCount = between(3, 7);
      for (let t = 0; t < turnCount; t++) {
        emitTurn(sessionId, at, rand() < 0.18);
        at += between(30000, 600000);
        turns++;
      }
    }

    await flush();
    console.log(
      `  ${project.name.padEnd(16)} service=${project.serviceName.padEnd(16)} sessions=${sessions} turns=${turns}`,
    );
    console.log(`  ${" ".repeat(16)} ${project.projectId}`);
  }

  console.log("\nWaiting for the span WAL to drain...");
  const first = projects[0];
  for (let attempt = 0; attempt < 60; attempt++) {
    const res = await fetch(`${BASE_URL}/v1/traces?limit=1`, {
      headers: { Authorization: `Bearer ${first.apiKey}` },
    });
    if (res.ok) {
      const body = (await res.json()) as { total: number };
      if (body.total > 0) {
        console.log(`Done. ${first.name} reports ${body.total} traces.`);
        return;
      }
    }
    await Bun.sleep(500);
  }
  throw new Error("Traces never became queryable");
}

try {
  await main();
} finally {
  await shutdownPulse();
}
