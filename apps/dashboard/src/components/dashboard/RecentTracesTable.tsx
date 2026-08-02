import { useNavigate } from "react-router-dom";
import type { Trace } from "../../lib/apiClient";
import { fmtCost, fmtLatency, fmtRel } from "../../lib/format";
import { sourceName } from "../../lib/sources";
import { StatusDot } from "../ui/StatusDot";

interface RecentTracesTableProps {
  traces: Trace[];
  loading?: boolean;
}

export function RecentTracesTable({ traces, loading }: RecentTracesTableProps) {
  const navigate = useNavigate();

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold tracking-[-0.015em] text-fg">
          Recent traces
        </h2>
        <button
          type="button"
          onClick={() => navigate("/dashboard/traces")}
          className="cursor-pointer border-0 bg-transparent text-xs text-fg-4 transition-colors hover:text-fg"
        >
          View all →
        </button>
      </header>

      {loading && traces.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-9 text-sm text-dim">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading traces…
        </div>
      ) : traces.length === 0 ? (
        <div className="py-9 text-center text-sm text-dim">No traces found</div>
      ) : (
        <div>
          {traces.map((trace) => {
            const isError = trace.status === "error";
            const service =
              trace.services?.[0] ?? trace.provider ?? sourceName(trace.source);
            const model = trace.modelUsed ?? trace.modelRequested ?? "—";

            return (
              <button
                type="button"
                key={trace.traceId}
                onClick={() => navigate(`/dashboard/traces/${trace.traceId}`)}
                className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-0 border-b border-line-soft px-5 py-3 text-left transition-[filter,background-color] last:border-b-0 hover:brightness-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue sm:grid-cols-[auto_minmax(0,1fr)_minmax(120px,0.45fr)_74px_74px_70px]"
                style={{
                  background: isError ? "var(--red-tint)" : "transparent",
                  boxShadow: isError ? "inset 2px 0 0 var(--red)" : undefined,
                }}
              >
                <StatusDot status={trace.status} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-fg">
                    {trace.summary || `Trace ${trace.traceId.slice(0, 8)}`}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-dim sm:hidden">
                    {service} · {model}
                  </span>
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block truncate text-[12px] text-fg-3">
                    {service}
                  </span>
                  <span className="block truncate font-mono text-[10.5px] text-faint">
                    {model}
                  </span>
                </span>
                <span className="hidden text-right text-[12px] tabular-nums text-fg-3 sm:block">
                  {fmtLatency(trace.latencyMs)}
                </span>
                <span className="hidden text-right text-[12px] tabular-nums text-fg-3 sm:block">
                  {fmtCost(trace.costCents)}
                </span>
                <span className="text-right text-[11.5px] tabular-nums text-faint">
                  {fmtRel(trace.timestamp)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
