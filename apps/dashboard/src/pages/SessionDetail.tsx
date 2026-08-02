import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useSessionTraceSummariesQuery, useSpansQuery } from "../api";
import SessionTraceList from "../components/sessions/SessionTraceList";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { useProject } from "../hooks/useProject";
import type { Span, Trace } from "../lib/apiClient";
import { fmtCost, fmtDuration, fmtTokens } from "../lib/format";

interface SessionStats {
  traceCount: number;
  durationMs: number;
  costCents: number;
  totalTokens: number;
  errorCount: number;
}

interface SessionLocationState {
  returnTo?: unknown;
  agentName?: unknown;
  cwd?: unknown;
}

function shortSessionId(sessionId: string): string {
  if (sessionId.length <= 16) return sessionId;
  return `${sessionId.slice(0, 8)}...${sessionId.slice(-4)}`;
}

function metadataString(
  metadata: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function firstSpanField(
  spans: Span[] | undefined,
  field: "agentName" | "cwd",
): string | undefined {
  if (!spans) return undefined;
  for (const span of spans) {
    const value = span[field];
    if (typeof value === "string" && value.trim()) return value;
    const fromMeta = metadataString(
      span.metadata,
      field === "agentName"
        ? ["agentName", "agent_name", "agent"]
        : ["cwd", "workingDirectory", "working_directory"],
    );
    if (fromMeta) return fromMeta;
  }
  return undefined;
}

function deriveSessionIdentity(
  traces: Trace[],
  spans: Span[] | undefined,
  locationState: SessionLocationState | null,
  idShort: string,
): { agentName: string; cwd: string } {
  const fromState = (key: "agentName" | "cwd") => {
    const value = locationState?.[key];
    return typeof value === "string" && value.trim() ? value : undefined;
  };

  const fromTracesMeta = (keys: string[]) => {
    for (const trace of traces) {
      const value = metadataString(trace.metadata, keys);
      if (value) return value;
      const nested = firstSpanField(
        trace.spans,
        keys[0] === "cwd" ? "cwd" : "agentName",
      );
      if (nested) return nested;
    }
    return undefined;
  };

  return {
    agentName:
      fromState("agentName") ??
      firstSpanField(spans, "agentName") ??
      fromTracesMeta(["agentName", "agent_name", "agent"]) ??
      `Session ${idShort}`,
    cwd:
      fromState("cwd") ??
      firstSpanField(spans, "cwd") ??
      fromTracesMeta(["cwd", "workingDirectory", "working_directory"]) ??
      "—",
  };
}

function calculateSessionStats(traces: Trace[]): SessionStats {
  const starts = traces
    .map((trace) => new Date(trace.timestamp).getTime())
    .filter(Number.isFinite);
  const ends = traces
    .map((trace) => {
      const start = new Date(trace.timestamp).getTime();
      return start + (trace.latencyMs || 0);
    })
    .filter(Number.isFinite);

  return {
    traceCount: traces.length,
    durationMs:
      starts.length > 0 && ends.length > 0
        ? Math.max(0, Math.max(...ends) - Math.min(...starts))
        : 0,
    costCents: traces.reduce(
      (total, trace) => total + (trace.costCents ?? 0),
      0,
    ),
    totalTokens: traces.reduce(
      (total, trace) =>
        total + (trace.inputTokens ?? 0) + (trace.outputTokens ?? 0),
      0,
    ),
    errorCount: traces.filter((trace) => trace.status === "error").length,
  };
}

function BackChevron() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m15 19-7-7 7-7" />
    </svg>
  );
}

interface SummaryTileProps {
  label: string;
  value: string;
  error?: boolean;
}

function SummaryTile({ label, value, error }: SummaryTileProps) {
  return (
    <div className="rounded-xl border border-line bg-surface-3 p-3">
      <div className="mb-1.5 text-[11.5px] text-faint">{label}</div>
      <div
        className="text-xl font-semibold tracking-[-0.02em] tabular-nums"
        style={{ color: error ? "var(--red)" : "var(--text)" }}
      >
        {value}
      </div>
    </div>
  );
}

export default function SessionDetail() {
  const { selectedProject } = useProject();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as SessionLocationState | null;
  const returnTo =
    typeof locationState?.returnTo === "string" &&
    locationState.returnTo.startsWith("/dashboard/sessions")
      ? locationState.returnTo
      : "/dashboard/sessions";

  const sessionQuery = useSessionTraceSummariesQuery(selectedProject?.id, id);
  const spansQuery = useSpansQuery(
    "session-detail-spans",
    selectedProject?.id,
    { session_id: id, limit: 50 },
  );
  const session = sessionQuery.data ?? null;

  if (sessionQuery.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingSpinner text="Loading session..." />
      </div>
    );
  }

  if (sessionQuery.error instanceof Error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-sm text-red-text">
            {sessionQuery.error.message}
          </p>
          <button
            type="button"
            onClick={() => sessionQuery.refetch()}
            className="rounded-lg border-0 bg-blue px-4 py-2 text-sm text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-fg">404</h1>
          <p className="mb-6 text-sm text-dim">
            The session you're looking for doesn't exist.
          </p>
          <Link to={returnTo} className="text-sm text-blue hover:underline">
            Back to Sessions
          </Link>
        </div>
      </div>
    );
  }

  const sessionId = session.sessionId || id || "";
  const idShort = shortSessionId(sessionId);
  const traces = [...session.traces].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const stats = calculateSessionStats(traces);
  const identity = deriveSessionIdentity(
    traces,
    spansQuery.data?.spans ?? session.spans,
    locationState,
    idShort,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-bg">
      <header className="flex h-14 shrink-0 items-center border-b border-line bg-topbar px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(returnTo, { replace: true })}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] text-fg-4 transition-colors hover:bg-hover hover:text-fg"
          >
            <BackChevron />
            Sessions
          </button>
          <span className="h-4 w-px shrink-0 bg-line-strong" />
          <span
            className="truncate font-mono text-[12.5px] text-fg-3"
            title={sessionId}
          >
            {idShort}
          </span>
          {stats.errorCount > 0 ? (
            <span className="shrink-0 rounded-full bg-red-tint-2 px-2 py-[3px] text-[11px] font-semibold text-red">
              {stats.errorCount} {stats.errorCount === 1 ? "error" : "errors"}
            </span>
          ) : null}
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1180px] p-6">
          <section className="mb-4 rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className="truncate text-[22px] font-semibold tracking-[-0.022em] text-fg">
                  {identity.agentName}
                </h1>
                <p className="mt-1.5 truncate font-mono text-[12.5px] text-dim">
                  {identity.cwd}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <SummaryTile
                label="Traces"
                value={stats.traceCount.toLocaleString()}
              />
              <SummaryTile
                label="Duration"
                value={fmtDuration(stats.durationMs)}
              />
              <SummaryTile
                label="Total cost"
                value={fmtCost(stats.costCents)}
              />
              <SummaryTile
                label="Total tokens"
                value={fmtTokens(stats.totalTokens)}
              />
              <SummaryTile
                label="Errors"
                value={stats.errorCount.toLocaleString()}
                error={stats.errorCount > 0}
              />
            </div>
          </section>

          <SessionTraceList traces={traces} returnTo={location.pathname} />
        </div>
      </main>
    </div>
  );
}
