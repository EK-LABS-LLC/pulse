import { SPAN_SOURCES, type SpanSource } from "@pulse/api-contracts";

/**
 * Badge labels for the real source enum. The redesign mock only covered three
 * sources under different names; these cover all five the server accepts.
 */
const SOURCE_LABELS: Record<SpanSource, string> = {
  claude_code: "CC",
  codex: "CDX",
  opencode: "OC",
  openclaw: "OCW",
  sdk: "SDK",
};

const SOURCE_NAMES: Record<SpanSource, string> = {
  claude_code: "Claude Code",
  codex: "Codex",
  opencode: "OpenCode",
  openclaw: "OpenClaw",
  sdk: "SDK",
};

export const SOURCE_OPTIONS = SPAN_SOURCES.map((value) => ({
  value,
  label: SOURCE_LABELS[value],
  name: SOURCE_NAMES[value],
}));

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source as SpanSource] ?? source;
}

export function sourceName(source: string): string {
  return SOURCE_NAMES[source as SpanSource] ?? source;
}
