import { useNavigate } from "react-router-dom";
import type { Trace } from "../../lib/apiClient";
import { fmtCost, fmtLatency, fmtRel } from "../../lib/format";

interface SessionTraceListProps {
  traces: Trace[];
  returnTo: string;
}

const GRID_COLUMNS = "16px 60px minmax(200px, 1fr) 100px 90px 66px 26px";

function ChevronRight() {
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
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export default function SessionTraceList({
  traces,
  returnTo,
}: SessionTraceListProps) {
  const navigate = useNavigate();

  const openTrace = (traceId: string) => {
    navigate(`/dashboard/traces/${encodeURIComponent(traceId)}`, {
      state: { returnTo },
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <header className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold tracking-[-0.015em] text-fg">
          Traces in this session
        </h2>
        <p className="mt-0.5 text-xs text-dim">Chronological, oldest first</p>
      </header>

      {traces.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-dim">
          No traces in this session
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div
            role="list"
            aria-label="Traces in this session"
            className="min-w-[850px]"
          >
            {traces.map((trace, index) => {
              const isError = trace.status === "error";

              return (
                <div
                  key={trace.traceId}
                  role="button"
                  tabIndex={0}
                  onClick={() => openTrace(trace.traceId)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openTrace(trace.traceId);
                    }
                  }}
                  className="grid cursor-pointer items-center gap-3 border-b border-line-soft px-5 py-[13px] transition-[filter,background-color] last:border-b-0 hover:brightness-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue"
                  style={{
                    gridTemplateColumns: GRID_COLUMNS,
                    background: isError ? "var(--red-tint)" : undefined,
                    boxShadow: isError ? "inset 2px 0 0 var(--red)" : undefined,
                  }}
                >
                  <span
                    aria-label={isError ? "Error" : "Success"}
                    className="h-[7px] w-[7px] justify-self-center rounded-full"
                    style={{
                      background: isError ? "var(--red)" : "var(--green)",
                    }}
                  />
                  <span className="text-[11px] tabular-nums text-faint">
                    Step {index + 1}
                  </span>
                  <span
                    className="truncate text-[13px]"
                    style={{
                      color: isError ? "var(--red-text)" : "var(--text-2)",
                    }}
                    title={trace.summary}
                  >
                    {trace.summary || "Untitled trace"}
                  </span>
                  <span className="text-right text-xs tabular-nums text-dim">
                    {fmtLatency(trace.latencyMs)}
                  </span>
                  <span className="text-right text-xs tabular-nums text-dim">
                    {fmtCost(trace.costCents)}
                  </span>
                  <span
                    className="text-right text-xs text-faint"
                    title={new Date(trace.timestamp).toLocaleString()}
                  >
                    {fmtRel(trace.timestamp)}
                  </span>
                  <span className="flex justify-end text-faint">
                    <ChevronRight />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
