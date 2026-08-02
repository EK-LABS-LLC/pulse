import { useNavigate } from "react-router-dom";
import type { AgentSessionSummary } from "../../lib/agentSessions";
import { fmtCost, fmtRel, fmtTokens } from "../../lib/format";

interface SessionsTableProps {
  sessions: AgentSessionSummary[];
  returnTo?: string;
}

const GRID_COLUMNS =
  "120px minmax(160px, 1.3fr) minmax(120px, 1fr) 70px 64px 76px 90px";

export default function SessionsTable({
  sessions,
  returnTo,
}: SessionsTableProps) {
  const navigate = useNavigate();

  const handleRowClick = (session: AgentSessionSummary) => {
    navigate(`/dashboard/sessions/${encodeURIComponent(session.sessionId)}`, {
      state: {
        returnTo: returnTo ?? "/dashboard/sessions",
        agentName: session.agentName,
        cwd: session.cwd,
      },
    });
  };

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="text-sm text-dim">No sessions found</p>
      </div>
    );
  }

  return (
    <div
      role="table"
      aria-label="Sessions"
      className="overflow-x-auto rounded-2xl border border-line bg-surface"
    >
      <div className="min-w-[880px]">
        <div
          role="row"
          className="grid gap-2.5 border-b border-line px-5 py-2.5"
          style={{ gridTemplateColumns: GRID_COLUMNS }}
        >
          {[
            "Session",
            "Agent · directory",
            "Models",
            "Traces",
            "Errors",
            "Cost",
            "Last active",
          ].map((header, index) => (
            <span
              key={header}
              role="columnheader"
              className={`text-[11.5px] font-semibold text-dim ${
                index >= 3 ? "text-right" : ""
              }`}
            >
              {header}
            </span>
          ))}
        </div>

        <div role="rowgroup">
          {sessions.map((session) => {
            const isError =
              session.status === "error" || session.errorCount > 0;
            const totalTokens = session.inputTokens + session.outputTokens;

            return (
              <div
                key={session.sessionId}
                role="row"
                tabIndex={0}
                onClick={() => handleRowClick(session)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleRowClick(session);
                  }
                }}
                className="grid cursor-pointer items-center gap-2.5 border-b border-line-soft px-5 py-[13px] transition-colors last:border-b-0 hover:bg-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue"
                style={{
                  gridTemplateColumns: GRID_COLUMNS,
                  background: isError ? "var(--red-tint)" : undefined,
                  boxShadow: isError ? "inset 2px 0 0 var(--red)" : undefined,
                }}
              >
                <span
                  role="cell"
                  className="truncate font-mono text-xs text-fg-3"
                  title={session.sessionId}
                >
                  {session.shortId}
                </span>

                <div role="cell" className="min-w-0">
                  <div
                    className="truncate text-[13px] text-fg"
                    title={session.agentName}
                  >
                    {session.agentName}
                  </div>
                  <div
                    className="mt-0.5 truncate font-mono text-[11px] text-faint"
                    title={session.cwd}
                  >
                    {session.cwd || "—"}
                  </div>
                </div>

                <div
                  role="cell"
                  className="flex min-w-0 flex-wrap items-center gap-1.5"
                >
                  {session.model ? (
                    <span
                      className="max-w-full truncate rounded-md bg-fill px-1.5 py-0.5 font-mono text-[10.5px] text-fg-4"
                      title={`${session.model} · ${fmtTokens(totalTokens)} tokens`}
                    >
                      {session.model}
                    </span>
                  ) : (
                    <span className="text-xs text-faint">—</span>
                  )}
                </div>

                <span
                  role="cell"
                  className="text-right text-[12.5px] tabular-nums text-fg"
                >
                  {session.traceCount.toLocaleString()}
                </span>

                <span role="cell" className="text-right">
                  <span
                    className="inline-flex min-w-7 justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums"
                    style={{
                      background: isError ? "var(--red-tint-2)" : "var(--fill)",
                      color: isError ? "var(--red-text)" : "var(--faint)",
                    }}
                  >
                    {session.errorCount.toLocaleString()}
                  </span>
                </span>

                <span
                  role="cell"
                  className="text-right text-[12.5px] tabular-nums text-fg-3"
                >
                  {fmtCost(session.costCents)}
                </span>

                <span
                  role="cell"
                  className="text-right text-xs text-faint"
                  title={new Date(session.timestamp).toLocaleString()}
                >
                  {fmtRel(session.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
