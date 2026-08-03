import { useNavigate } from "react-router-dom";
import type { Trace } from "../../lib/apiClient";
import { buildTraceDetailPath } from "../../lib/dashboardNavigation";
import { fmtLatency, fmtRel } from "../../lib/format";
import { sourceName } from "../../lib/sources";

interface RecentTracesTableProps {
  traces: Trace[];
  loading?: boolean;
  returnTo: string;
}

export function RecentTracesTable({
  traces,
  loading,
  returnTo,
}: RecentTracesTableProps) {
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
          className="cursor-pointer border-0 bg-transparent text-[12.5px] text-blue transition-colors hover:text-fg"
        >
          View all traces →
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

            return (
              <button
                type="button"
                key={trace.traceId}
                onClick={() =>
                  navigate(buildTraceDetailPath(trace.traceId, returnTo))
                }
                className="grid w-full cursor-pointer grid-cols-[14px_minmax(0,1fr)_66px] items-center gap-3 border-0 border-b border-line-soft px-5 py-3 text-left transition-[filter,background-color] last:border-b-0 hover:brightness-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue sm:grid-cols-[14px_minmax(200px,1fr)_130px_80px_66px]"
                style={{
                  background: isError ? "var(--red-tint)" : "transparent",
                  boxShadow: isError ? "inset 2px 0 0 var(--red)" : undefined,
                }}
              >
                <span
                  className="h-[7px] w-[7px] justify-self-center rounded-full"
                  style={{
                    background: isError ? "var(--red)" : "var(--green)",
                  }}
                />
                <span className="min-w-0 truncate text-[13px] text-fg">
                  {trace.summary || `Trace ${trace.traceId.slice(0, 8)}`}
                </span>
                <span className="hidden min-w-0 items-center gap-1.5 sm:flex">
                  <span className="min-w-0 truncate rounded-md bg-fill px-1.5 py-[1.5px] font-mono text-[11px] text-fg-4">
                    {service}
                  </span>
                  {isError && trace.errorService ? (
                    <span className="min-w-0 truncate rounded-md bg-red-tint-2 px-1.5 py-[1.5px] font-mono text-[11px] text-red">
                      ↯ {trace.errorService}
                    </span>
                  ) : null}
                </span>
                <span className="hidden text-right text-[12px] tabular-nums text-fg-3 sm:block">
                  {fmtLatency(trace.latencyMs)}
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
