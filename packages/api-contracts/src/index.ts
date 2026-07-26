export const TRACE_STATUSES = ["success", "error"] as const;
export type TraceStatus = (typeof TRACE_STATUSES)[number];

export const SPAN_SOURCES = [
  "claude_code",
  "codex",
  "opencode",
  "openclaw",
  "sdk",
] as const;
export type SpanSource = (typeof SPAN_SOURCES)[number];

export const SPAN_KINDS = [
  "llm_call",
  "tool_use",
  "agent_run",
  "session",
  "user_prompt",
  "llm_response",
  "notification",
] as const;
export type SpanKind = (typeof SPAN_KINDS)[number];

export const AGENT_SESSION_SORTS = [
  "recent",
  "oldest",
  "duration",
  "errors",
  "volume",
] as const;
export type AgentSessionSort = (typeof AGENT_SESSION_SORTS)[number];

export const ANALYTICS_GROUPS = ["day", "hour", "model", "provider"] as const;
export type AnalyticsGroupBy = (typeof ANALYTICS_GROUPS)[number];

export const SPAN_ANALYTICS_GROUPS = ["day", "hour"] as const;
export type SpanAnalyticsGroupBy = (typeof SPAN_ANALYTICS_GROUPS)[number];
