import type { Span } from "./apiClient";
import { fmtLatency, tint } from "./format";

export interface SpanRow {
  id: string;
  isRoot: boolean;
  label: string;
  service?: string;
  toolName?: string;
  indentPx: string;
  color: string;
  labelColor: string;
  leftPct: string;
  widthPct: string;
  labelLeftPct: string;
  durationLabel: string;
  isError: boolean;
  depth: number;
}

/**
 * Tool families get their own hue so a waterfall reads at a glance. The mock
 * derived this from an invented service-per-tool map; tool name is the real
 * field carrying the same signal.
 */
const TOOL_COLORS: Record<string, string> = {
  Read: "var(--teal)",
  Write: "var(--teal)",
  Edit: "var(--teal)",
  NotebookEdit: "var(--teal)",
  Grep: "var(--teal)",
  Glob: "var(--teal)",
  Bash: "var(--purple)",
  BashOutput: "var(--purple)",
  KillShell: "var(--purple)",
  WebFetch: "var(--orange)",
  WebSearch: "var(--orange)",
  Task: "var(--pink)",
  TodoWrite: "var(--neutral)",
};

const KIND_COLORS: Record<string, string> = {
  llm_call: "var(--blue)",
  llm_response: "var(--blue)",
  agent_run: "var(--neutral-soft)",
  session: "var(--neutral-soft)",
  user_prompt: "var(--dim)",
  notification: "var(--dim)",
};

function colorFor(span: Span): string {
  if (span.status === "error") return "var(--red)";
  if (span.kind === "tool_use") {
    return (span.toolName && TOOL_COLORS[span.toolName]) || "var(--neutral)";
  }
  return KIND_COLORS[span.kind] ?? "var(--neutral)";
}

/**
 * The server sets `label` to the event type for most spans, which reads as
 * "provider_call" everywhere. Derive from the fields that actually identify a
 * span first, and fall back to `label` only when it carries something else.
 */
export function spanLabel(span: Span): string {
  if (span.kind === "tool_use")
    return span.toolName ?? span.label ?? "Tool call";
  if (span.kind === "llm_call") {
    return span.model ? `Model turn · ${span.model}` : "Model turn";
  }
  if (span.kind === "agent_run") return span.agentName ?? "Agent run";
  if (span.label && span.label !== span.eventType) return span.label;
  return span.eventType || span.kind;
}

/**
 * Lays spans out as a waterfall: indent from the parent chain, bar geometry as
 * a share of the root span's duration.
 *
 * Real spans carry absolute timestamps rather than the mock's offsets, so the
 * offset is derived against the earliest span. Spans whose parent is missing
 * from `spans` (a partial page) are treated as roots rather than dropped.
 */
export function buildSpanRows(
  spans: Span[],
  options: { skipRoot?: boolean } = {},
): SpanRow[] {
  if (spans.length === 0) return [];

  const byId = new Map(spans.map((span) => [span.spanId, span]));
  const sorted = [...spans].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const startOf = (span: Span) => new Date(span.timestamp).getTime();
  const originMs = startOf(sorted[0]);
  const endMs = Math.max(
    ...sorted.map((span) => startOf(span) + (span.durationMs ?? 0)),
  );
  const totalMs = Math.max(endMs - originMs, 1);

  const depthOf = (span: Span): number => {
    let depth = 0;
    let parentId = span.parentSpanId;
    const seen = new Set<string>([span.spanId]);
    while (parentId && byId.has(parentId) && !seen.has(parentId)) {
      seen.add(parentId);
      depth += 1;
      parentId = byId.get(parentId)!.parentSpanId;
    }
    return depth;
  };

  const depthShift = options.skipRoot ? 1 : 0;

  return sorted
    .map((span) => {
      const depth = depthOf(span);
      const isRoot = !span.parentSpanId || !byId.has(span.parentSpanId);
      const offsetMs = startOf(span) - originMs;
      const durationMs = span.durationMs ?? 0;
      const color = colorFor(span);
      const isStep = depth > 1;
      const leftPct = `${((offsetMs / totalMs) * 100).toFixed(1)}%`;
      const widthPct = `${Math.max((durationMs / totalMs) * 100, 1.2).toFixed(1)}%`;

      return {
        id: span.spanId,
        isRoot,
        label: spanLabel(span),
        service: span.service,
        toolName: span.toolName,
        indentPx: `${Math.max(0, depth - depthShift) * 14}px`,
        color: isStep && span.status !== "error" ? tint(color, 0.5) : color,
        labelColor: isStep ? "var(--dim)" : "var(--text)",
        leftPct,
        widthPct,
        labelLeftPct: `calc(${leftPct} + ${widthPct} + 6px)`,
        durationLabel: fmtLatency(durationMs),
        isError: span.status === "error",
        depth,
      };
    })
    .filter((row) => !(options.skipRoot && row.isRoot));
}
