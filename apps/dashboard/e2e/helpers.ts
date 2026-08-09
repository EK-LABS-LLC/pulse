import { request } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BASE_URL = process.env.PULSE_E2E_BASE_URL ?? "http://localhost:39000";
const EMAIL = "e2e@test.local";
const PASSWORD = "e2e-password-123";
const NAME = "E2E User";
const PROJECT_NAME = "E2E Project";
const CLI_BIN =
  process.env.PULSE_E2E_CLI ??
  join(process.cwd(), "..", "..", "..", "target", "debug", "pulse");

export interface E2ECredentials {
  baseUrl: string;
  projectId: string;
  apiKey: string;
  email: string;
  password: string;
}

let cached: E2ECredentials | null = null;

/**
 * Provision an isolated project + API key on the running server and seed it
 * with realistic spans. Idempotent within the run: signup is attempted, and
 * if the account already exists we sign in instead.
 */
export async function bootstrap(): Promise<E2ECredentials> {
  if (cached) return cached;

  const api = await request.newContext({ baseURL: BASE_URL });
  let apiKey: string;
  let projectId: string;

  const signup = await api.post("/dashboard/api/signup", {
    data: {
      name: NAME,
      email: EMAIL,
      password: PASSWORD,
      projectName: PROJECT_NAME,
    },
  });

  if (signup.ok()) {
    // Signup auto-creates a project; list it and create a fresh API key.
    const signIn = await api.post("/api/auth/sign-in/email", {
      data: { email: EMAIL, password: PASSWORD },
    });
    if (!signIn.ok()) {
      throw new Error(`sign-in failed: ${signIn.status()} ${await signIn.text()}`);
    }
    const cookies = signIn.headers()["set-cookie"] ?? "";
    const token = /better-auth\.session_token=([^;]+)/.exec(cookies)?.[1];
    if (!token) throw new Error("no session token after sign-in");

    const projectsRes = await api.get("/dashboard/api/projects", {
      headers: { cookie: `better-auth.session_token=${token}` },
    });
    if (!projectsRes.ok()) throw new Error(`list projects failed: ${projectsRes.status()}`);
    const projects = (await projectsRes.json()) as { projects: { id: string }[] };
    projectId = projects.projects[0]!.id;

    const keyRes = await api.post("/dashboard/api/api-keys", {
      headers: {
        cookie: `better-auth.session_token=${token}`,
        "X-Project-Id": projectId,
      },
      data: { name: "E2E Key" },
    });
    if (!keyRes.ok()) throw new Error(`create api key failed: ${keyRes.status()}`);
    apiKey = ((await keyRes.json()) as { apiKey: string }).apiKey;
  } else {
    // Account exists (re-run against a persisted DB). Sign in and reuse the
    // first project and its first API key.
    const signIn = await api.post("/api/auth/sign-in/email", {
      data: { email: EMAIL, password: PASSWORD },
    });
    if (!signIn.ok()) {
      throw new Error(`sign-in failed: ${signIn.status()} ${await signIn.text()}`);
    }
    const cookies = signIn.headers()["set-cookie"] ?? "";
    const token = /better-auth\.session_token=([^;]+)/.exec(cookies)?.[1];
    if (!token) throw new Error("no session token after sign-in");

    const projectsRes = await api.get("/dashboard/api/projects", {
      headers: { cookie: `better-auth.session_token=${token}` },
    });
    if (!projectsRes.ok()) throw new Error(`list projects failed: ${projectsRes.status()}`);
    const projects = (await projectsRes.json()) as { projects: { id: string }[] };
    projectId = projects.projects[0]!.id;

    const keysRes = await api.get("/dashboard/api/api-keys", {
      headers: {
        cookie: `better-auth.session_token=${token}`,
        "X-Project-Id": projectId,
      },
    });
    if (!keysRes.ok()) throw new Error(`list api keys failed: ${keysRes.status()}`);
    const keys = (await keysRes.json()) as { keys: { key: string }[] };
    apiKey = keys.keys[0]!.key;
  }

  await emitViaCliIfEmpty(api, apiKey, projectId);
  await api.dispose();

  cached = { baseUrl: BASE_URL, projectId, apiKey, email: EMAIL, password: PASSWORD };
  return cached;
}

/**
 * Drive the actual CLI (`pulse init` + `pulse emit`) against the running
 * server so the frontend test verifies the real ingest pipeline the CLI uses,
 * not synthetic `/v1/spans/batch` payloads. Skips if the project already has
 * spans (e.g. a re-run against a persisted database).
 */
async function emitViaCliIfEmpty(
  api: Awaited<ReturnType<typeof request.newContext>>,
  apiKey: string,
  projectId: string,
): Promise<void> {
  const existing = await api.get("/v1/spans", {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!existing.ok()) throw new Error(`spans check failed: ${existing.status()}`);
  const data = (await existing.json()) as { total?: number; spans?: unknown[] };
  const count = data.total ?? (data.spans ? data.spans.length : 0);
  if (count > 0) return;

  const home = mkdtempSync(join(tmpdir(), "pulse-e2e-cli-"));
  const cli = (args: string[], input?: string) =>
    execFileSync(CLI_BIN, args, {
      env: { ...process.env, HOME: home },
      stdio: ["pipe", "ignore", "pipe"],
      input,
    });

  // Point the CLI's isolated config at the running server.
  cli([
    "init",
    "--api-url",
    BASE_URL,
    "--api-key",
    apiKey,
    "--project-id",
    projectId,
    "--no-validate",
  ]);

  // Emit a realistic Claude Code session through the CLI's real emit path.
  const sessionId = `e2e-cli-${Date.now()}`;
  const emit = (eventType: string, payload: unknown) =>
    cli(["emit", eventType], JSON.stringify(payload));

  emit("session_start", { session_id: sessionId, model: "claude-opus-4-20250224", cwd: "/workdir/e2e" });
  emit("user_prompt_submit", { session_id: sessionId, prompt: "Add rate limiting to the API", model: "claude-opus-4-20250224", cwd: "/workdir/e2e" });
  emit("pre_tool_use", { session_id: sessionId, tool_use_id: "toolu_01", tool_name: "Bash", tool_input: { command: "curl localhost:3000/health" } });
  emit("post_tool_use", { session_id: sessionId, tool_use_id: "toolu_01", tool_name: "Bash", tool_input: { command: "curl localhost:3000/health" }, tool_response: { output: "ok", exit_code: 0 } });
  emit("pre_tool_use", { session_id: sessionId, tool_use_id: "toolu_02", tool_name: "Edit", tool_input: { file_path: "src/rate-limit.ts" } });
  emit("post_tool_use", { session_id: sessionId, tool_use_id: "toolu_02", tool_name: "Edit", tool_input: { file_path: "src/rate-limit.ts" }, tool_response: { ok: true } });
  emit("assistant_message", { session_id: sessionId, model: "claude-opus-4-20250224", tokens: { input: 1200, output: 300 }, cost: 0.05 });
  emit("stop", { session_id: sessionId });
  emit("session_end", { session_id: sessionId, reason: "finished" });

  // The CLI posts asynchronously; give the WAL a moment to land.
  await new Promise((resolve) => setTimeout(resolve, 1500));
}

/**
 * Obtain a login_url for the browser using the API-key local-login flow, so
 * tests can drive the real dashboard without a password.
 */
export async function buildLoginUrl(creds: E2ECredentials, redirectPath = "/dashboard"): Promise<string> {
  const api = await request.newContext({ baseURL: creds.baseUrl });
  const res = await api.post("/dashboard/api/local-login-token", {
    data: {
      api_key: creds.apiKey,
      project_id: creds.projectId,
      redirect_url: `${creds.baseUrl}${redirectPath}`,
    },
  });
  if (!res.ok()) throw new Error(`local-login-token failed: ${res.status()} ${await res.text()}`);
  const body = (await res.json()) as { login_url: string };
  await api.dispose();
  return body.login_url;
}
