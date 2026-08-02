import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import TraceSpanTree from "../components/traces/TraceSpanTree";
import { SpanDetailPanel } from "../components/traces/SpanDetailPanel";
import { JsonBlock } from "../components/traces/JsonBlock";
import { StatusDot } from "../components/ui/StatusDot";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { useTraceDetailQuery } from "../api";
import { useProject } from "../hooks/useProject";
import { fmtCost, fmtLatency, fmtRel, fmtTokens } from "../lib/format";
import { sourceName } from "../lib/sources";

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center">{children}</div>
  );
}

function NotFoundState() {
  return (
    <Centered>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-6" style={{ color: "var(--dim)" }}>
          Trace not found
        </p>
        <Link to="/dashboard/traces">Back to traces</Link>
      </div>
    </Centered>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px]" style={{ color: "var(--dim)" }}>
        {label}
      </span>
      <span className="text-sm tabular-nums" style={{ color: "var(--text-2)" }}>
        {value}
      </span>
    </div>
  );
}

export default function TraceDetail() {
  const { selectedProject } = useProject();
  const { id } = useParams<{ id: string }>();
  const [activeSpanId, setActiveSpanId] = useState<string | null>(null);

  const traceQuery = useTraceDetailQuery(selectedProject?.id, id);
  const trace = traceQuery.data ?? null;
  const errorMessage =
    traceQuery.error instanceof Error ? traceQuery.error.message : null;

  const notFound = useMemo(() => {
    if (!id) return true;
    if (!errorMessage) return false;
    const message = errorMessage.toLowerCase();
    return message.includes("404") || message.includes("not found");
  }, [id, errorMessage]);

  const spans = useMemo(() => trace?.spans ?? [], [trace]);
  const activeSpan = useMemo(
    () => spans.find((span) => span.spanId === activeSpanId) ?? null,
    [spans, activeSpanId],
  );

  if (traceQuery.isPending) {
    return (
      <Centered>
        <LoadingSpinner text="Loading trace..." />
      </Centered>
    );
  }
  if (notFound || !trace) return <NotFoundState />;
  if (errorMessage) {
    return (
      <Centered>
        <div className="text-center">
          <p className="mb-4" style={{ color: "var(--red-text)" }}>
            {errorMessage}
          </p>
          <button
            onClick={() => traceQuery.refetch()}
            className="cursor-pointer rounded-lg border-0 px-4 py-2 text-sm"
            style={{ background: "var(--blue)", color: "#fff" }}
          >
            Retry
          </button>
        </div>
      </Centered>
    );
  }

  const totalTokens = (trace.inputTokens ?? 0) + (trace.outputTokens ?? 0);
  const services = trace.services ?? [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        className="flex flex-col gap-4 px-6 py-4"
        style={{ borderBottom: "1px solid var(--border-soft)" }}
      >
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/traces"
            className="text-sm no-underline"
            style={{ color: "var(--dim)" }}
          >
            ← Traces
          </Link>
          <StatusDot status={trace.status} />
          <span className="font-mono text-sm" style={{ color: "var(--text)" }}>
            {trace.traceId}
          </span>
          <span
            className="rounded px-1.5 py-0.5 text-[11px]"
            style={{ background: "var(--fill)", color: "var(--text-4)" }}
          >
            {sourceName(trace.source)}
          </span>
          <span className="text-xs" style={{ color: "var(--faint)" }}>
            {fmtRel(trace.timestamp)}
          </span>
        </div>

        <p className="text-sm" style={{ color: "var(--text-3)" }}>
          {trace.summary}
        </p>

        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <Metric label="Latency" value={fmtLatency(trace.latencyMs)} />
          <Metric label="Tokens" value={fmtTokens(totalTokens)} />
          <Metric label="Cost" value={fmtCost(trace.costCents)} />
          <Metric label="Spans" value={String(trace.spanCount)} />
          <Metric
            label="Model"
            value={trace.modelUsed ?? trace.modelRequested ?? "—"}
          />
          <Metric
            label="Service"
            value={services.length ? services.join(", ") : "—"}
          />
          {trace.errorService && (
            <div className="flex flex-col gap-1">
              <span className="text-[11px]" style={{ color: "var(--dim)" }}>
                Failed in
              </span>
              <span className="text-sm" style={{ color: "var(--red-text)" }}>
                {trace.errorService}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto p-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <section
            className="rounded-xl p-4"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-soft)",
            }}
          >
            <h3
              className="mb-3 text-xs tracking-wide uppercase"
              style={{ color: "var(--dim)" }}
            >
              Timeline
            </h3>
            <TraceSpanTree
              spans={spans}
              activeSpanId={activeSpanId}
              onSelect={setActiveSpanId}
            />
          </section>

          {(trace.requestBody != null || trace.responseBody != null) && (
            <section
              className="rounded-xl p-4"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-soft)",
              }}
            >
              <h3
                className="mb-3 text-xs tracking-wide uppercase"
                style={{ color: "var(--dim)" }}
              >
                {trace.status === "error" && trace.error != null
                  ? "Error"
                  : "Response"}
              </h3>
              <JsonBlock
                value={
                  trace.status === "error" && trace.error != null
                    ? trace.error
                    : trace.responseBody
                }
                maxHeight="280px"
              />
            </section>
          )}
        </div>

        <div className="min-h-0 lg:sticky lg:top-0">
          <SpanDetailPanel span={activeSpan} />
        </div>
      </div>
    </div>
  );
}
