import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import TraceSpanTree from "../components/traces/TraceSpanTree";
import { SpanDetailPanel } from "../components/traces/SpanDetailPanel";
import { JsonBlock } from "../components/traces/JsonBlock";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { StatusDot } from "../components/ui/StatusDot";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { useTraceDetailQuery } from "../api";
import { useProject } from "../hooks/useProject";
import { fmtCost, fmtLatency, fmtTokens } from "../lib/format";
import { sourceName } from "../lib/sources";
import {
  getTraceUiPrefs,
  setTraceUiPref,
  TRACE_UI_PREFS_EVENT,
  type TraceIoFormat,
} from "../lib/traceUiPrefs";

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center">{children}</div>
  );
}

function NotFoundState({ backTo }: { backTo: string }) {
  return (
    <Centered>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-6" style={{ color: "var(--dim)" }}>
          Trace not found
        </p>
        <Link to={backTo}>Back</Link>
      </div>
    </Centered>
  );
}

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-3 p-3">
      <span className="mb-1.5 block text-[11.5px] text-faint">{label}</span>
      <span
        className="block truncate text-xl font-semibold tracking-[-0.02em] tabular-nums"
        style={{ color: tone ?? "var(--text)" }}
      >
        {value}
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[12.5px]">
      <span className="shrink-0 text-faint">{label}</span>
      <span className="min-w-0 truncate text-right text-fg-3" title={value}>
        {value}
      </span>
    </div>
  );
}

function TokenMeter({
  label,
  value,
  percent,
  color,
}: {
  label: string;
  value: string;
  percent: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
        <span className="text-faint">{label}</span>
        <span className="tabular-nums text-fg-3">{value}</span>
      </div>
      <div className="h-[5px] overflow-hidden rounded-full bg-track">
        <div
          className="h-full rounded-full"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
}

function resolveBackTarget(returnTo: unknown): {
  to: string;
  label: string;
} {
  if (typeof returnTo === "string") {
    if (returnTo.startsWith("/dashboard/sessions")) {
      return { to: returnTo, label: "← Sessions" };
    }
    if (returnTo.startsWith("/dashboard/traces")) {
      return { to: returnTo, label: "← Traces" };
    }
  }
  return { to: "/dashboard/traces", label: "← Traces" };
}

function contentAsText(content: unknown): string | null {
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    const parts = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .filter(Boolean);
    return parts.length ? parts.join("\n") : null;
  }
  return null;
}

type IoSide = "request" | "response";

function extractChatBubbles(
  requestBody: unknown,
  responseBody: unknown,
  outputText?: string,
  side: IoSide = "request",
): Array<{ role: string; text: string }> {
  const bubbles: Array<{ role: string; text: string }> = [];

  if (side === "request" && requestBody && typeof requestBody === "object") {
    const messages = (requestBody as { messages?: unknown }).messages;
    if (Array.isArray(messages)) {
      for (const message of messages) {
        if (!message || typeof message !== "object") continue;
        const role =
          typeof (message as { role?: unknown }).role === "string"
            ? (message as { role: string }).role
            : "message";
        const text = contentAsText((message as { content?: unknown }).content);
        if (text) bubbles.push({ role, text });
      }
    }
  }

  if (side === "request") return bubbles;

  if (outputText?.trim()) {
    bubbles.push({ role: "assistant", text: outputText });
  } else if (responseBody && typeof responseBody === "object") {
    const body = responseBody as Record<string, unknown>;
    if (Array.isArray(body.choices)) {
      const choice = body.choices[0] as
        { message?: { content?: unknown }; text?: unknown } | undefined;
      const text =
        contentAsText(choice?.message?.content) ??
        (typeof choice?.text === "string" ? choice.text : null);
      if (text) bubbles.push({ role: "assistant", text });
    } else {
      const text = contentAsText(body.content);
      if (text) bubbles.push({ role: "assistant", text });
    }
  }

  return bubbles;
}

function ChatBubbles({
  bubbles,
}: {
  bubbles: Array<{ role: string; text: string }>;
}) {
  return (
    <div className="flex max-h-[280px] flex-col gap-2.5 overflow-auto">
      {bubbles.map((bubble, index) => {
        const isUser = bubble.role === "user";
        return (
          <div
            key={`${bubble.role}-${index}`}
            className={`max-w-[92%] rounded-xl px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap ${
              isUser ? "self-end" : "self-start"
            }`}
            style={{
              background: isUser ? "var(--blue-tint)" : "var(--surface-3)",
              border: `1px solid ${isUser ? "var(--blue-border)" : "var(--border-soft)"}`,
              color: "var(--text-2)",
            }}
          >
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-faint">
              {bubble.role}
            </div>
            {bubble.text}
          </div>
        );
      })}
    </div>
  );
}

export default function TraceDetail() {
  const { selectedProject } = useProject();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const locationState = location.state as { returnTo?: unknown } | null;
  const back = resolveBackTarget(locationState?.returnTo);
  const [activeSpanId, setActiveSpanId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ioFormat, setIoFormat] = useState<TraceIoFormat>(
    () => getTraceUiPrefs().ioFormat,
  );
  const [ioSide, setIoSide] = useState<IoSide>("request");

  useEffect(() => {
    const sync = () => setIoFormat(getTraceUiPrefs().ioFormat);
    window.addEventListener("storage", sync);
    window.addEventListener(TRACE_UI_PREFS_EVENT, sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(TRACE_UI_PREFS_EVENT, sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

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
  if (notFound || !trace) return <NotFoundState backTo={back.to} />;
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
  const inputPercent =
    totalTokens > 0 ? ((trace.inputTokens ?? 0) / totalTokens) * 100 : 0;
  const outputPercent =
    totalTokens > 0 ? ((trace.outputTokens ?? 0) / totalTokens) * 100 : 0;
  const shortId =
    trace.traceId.length > 18
      ? `${trace.traceId.slice(0, 10)}…${trace.traceId.slice(-6)}`
      : trace.traceId;
  const copyTraceId = async () => {
    try {
      await navigator.clipboard.writeText(trace.traceId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const payload =
    ioSide === "request"
      ? trace.requestBody
      : trace.status === "error" && trace.error != null
        ? trace.error
        : trace.responseBody;
  const chatBubbles = extractChatBubbles(
    trace.requestBody,
    trace.responseBody,
    trace.outputText,
    ioSide,
  );
  const showChat = ioFormat === "chat" && chatBubbles.length > 0;
  const isLlmTrace =
    trace.provider != null ||
    trace.modelUsed != null ||
    trace.modelRequested != null;
  const services = trace.services?.length
    ? trace.services.join(", ")
    : trace.errorService || "—";
  const model = trace.modelUsed ?? trace.modelRequested ?? "—";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-topbar px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={back.to}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] text-fg-4 no-underline transition-colors hover:bg-hover hover:text-fg"
          >
            {back.label}
          </Link>
          <span className="h-4 w-px shrink-0 bg-line-strong" />
          <span
            title={trace.traceId}
            className="truncate font-mono text-[12.5px] text-fg-3"
          >
            {shortId}
          </span>
          <span
            className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold capitalize"
            style={{
              background:
                trace.status === "error"
                  ? "var(--red-tint-2)"
                  : "var(--green-tint)",
              color: trace.status === "error" ? "var(--red)" : "var(--green)",
            }}
          >
            <StatusDot status={trace.status} />
            {trace.status}
          </span>
        </div>
        <button
          type="button"
          onClick={copyTraceId}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong bg-surface-2 px-2.5 py-1.5 text-xs text-fg-4 transition-colors hover:bg-hover hover:text-fg"
        >
          <svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-6 12h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2Z" />
          </svg>
          {copied ? "Copied" : "Copy ID"}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[1180px] p-6">
          <section className="mb-4 rounded-2xl border border-line bg-surface p-5">
            <h1 className="mb-1.5 text-[22px] font-semibold tracking-[-0.022em] text-fg">
              {trace.summary || "Trace detail"}
            </h1>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-dim">
              <span className="rounded-md bg-fill px-1.5 py-0.5 font-semibold text-fg-4">
                {sourceName(trace.source)}
              </span>
              <span className="font-mono">{model}</span>
              <span>·</span>
              <span>{new Date(trace.timestamp).toLocaleString()}</span>
              {trace.errorService ? (
                <>
                  <span>·</span>
                  <span className="text-red-text">
                    Failed in {trace.errorService}
                  </span>
                </>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <SummaryMetric
                label="Latency"
                value={fmtLatency(trace.latencyMs)}
              />
              <SummaryMetric label="Spans" value={String(trace.spanCount)} />
              <SummaryMetric label="Tokens" value={fmtTokens(totalTokens)} />
              <SummaryMetric label="Cost" value={fmtCost(trace.costCents)} />
              <SummaryMetric
                label="Status"
                value={trace.status}
                tone={trace.status === "error" ? "var(--red)" : "var(--green)"}
              />
            </div>
          </section>

          <div className="mb-4 grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <section className="min-w-0 rounded-2xl border border-line bg-surface p-5">
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[12.5px] font-semibold text-fg-3">
                  Request / Response
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <SegmentedControl
                    ariaLabel="Request or response"
                    value={ioSide}
                    onChange={setIoSide}
                    options={[
                      { value: "request", label: "Request" },
                      {
                        value: "response",
                        label: trace.status === "error" ? "Error" : "Response",
                      },
                    ]}
                  />
                  <SegmentedControl
                    ariaLabel="Request and response format"
                    value={ioFormat}
                    onChange={(value) => {
                      setIoFormat(value);
                      setTraceUiPref("ioFormat", value);
                    }}
                    options={[
                      { value: "chat", label: "Chat" },
                      { value: "json", label: "JSON" },
                    ]}
                  />
                </div>
              </div>
              {showChat ? (
                <ChatBubbles bubbles={chatBubbles} />
              ) : payload != null ? (
                <JsonBlock value={payload} maxHeight="340px" />
              ) : (
                <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-line-soft bg-surface-3 text-sm text-dim">
                  No {ioSide} payload was recorded.
                </div>
              )}
            </section>

            <div className="flex min-w-0 flex-col gap-4">
              <section className="rounded-2xl border border-line bg-surface p-5">
                <h2 className="mb-3.5 text-[12.5px] font-semibold text-fg-3">
                  Model
                </h2>
                {isLlmTrace ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <InfoRow label="Provider" value={trace.provider ?? "—"} />
                      <InfoRow label="Model" value={model} />
                    </div>
                    <div className="mt-4 flex flex-col gap-3">
                      <TokenMeter
                        label="Input tokens"
                        value={fmtTokens(trace.inputTokens)}
                        percent={inputPercent}
                        color="var(--blue)"
                      />
                      <TokenMeter
                        label="Output tokens"
                        value={fmtTokens(trace.outputTokens)}
                        percent={outputPercent}
                        color="var(--purple)"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-[12.5px] text-dim">
                    No model call was recorded on this trace.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-line bg-surface p-5">
                <h2 className="mb-3.5 text-[12.5px] font-semibold text-fg-3">
                  Metadata
                </h2>
                <div className="flex flex-col gap-2">
                  <InfoRow label="Service" value={services} />
                  <InfoRow label="Source" value={sourceName(trace.source)} />
                  <InfoRow label="Session" value={trace.sessionId ?? "—"} />
                  <InfoRow
                    label="Finish reason"
                    value={trace.finishReason ?? "—"}
                  />
                </div>
              </section>
            </div>
          </div>

          <section className="mb-4 min-h-[340px] rounded-2xl border border-line bg-surface p-5">
            <div className="mb-3.5 flex items-center justify-between gap-4">
              <h2 className="text-[12.5px] font-semibold text-fg-3">
                Span timeline
              </h2>
              <span className="text-[11.5px] text-faint">
                {spans.length.toLocaleString()} spans · click one to inspect
              </span>
            </div>
            <TraceSpanTree
              spans={spans}
              activeSpanId={activeSpanId}
              onSelect={setActiveSpanId}
            />
          </section>

          {activeSpan ? <SpanDetailPanel span={activeSpan} /> : null}
        </div>
      </div>
    </div>
  );
}
