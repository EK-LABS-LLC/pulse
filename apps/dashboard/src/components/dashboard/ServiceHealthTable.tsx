import { useNavigate } from "react-router-dom";
import { fmtLatency } from "../../lib/format";

export interface ServiceHealthRow {
  name: string;
  requests: number;
  errors: number;
  avgDurationMs: number;
}

interface ServiceHealthTableProps {
  rows: ServiceHealthRow[];
  rangeLabel: string;
}

export function ServiceHealthTable({
  rows,
  rangeLabel,
}: ServiceHealthTableProps) {
  const navigate = useNavigate();

  return (
    <section className="rounded-[18px] border border-line bg-surface p-4">
      <h3 className="text-sm font-semibold tracking-[-0.015em] text-fg">
        Service health
      </h3>
      <p className="mb-3 mt-0.5 text-xs text-dim">
        Errors attributed to the service that threw · {rangeLabel}
      </p>

      {rows.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-line-soft bg-surface-3 text-sm text-dim">
          No service rollups yet
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="mb-1.5 grid grid-cols-[1fr_76px_60px_62px] gap-2.5 border-b border-line pb-1.5">
            <span className="text-[11.5px] font-semibold text-dim">
              Service
            </span>
            <span className="text-right text-[11.5px] font-semibold text-dim">
              Requests
            </span>
            <span className="text-right text-[11.5px] font-semibold text-dim">
              Errors
            </span>
            <span className="text-right text-[11.5px] font-semibold text-dim">
              Avg
            </span>
          </div>
          {rows.map((row) => (
            <button
              key={row.name}
              type="button"
              onClick={() =>
                navigate(
                  `/dashboard/traces?service=${encodeURIComponent(row.name)}`,
                )
              }
              className="grid cursor-pointer grid-cols-[1fr_76px_60px_62px] items-center gap-2.5 border-0 border-b border-line-soft bg-transparent py-2 text-left last:border-b-0 hover:bg-hover"
            >
              <span className="truncate font-mono text-[12.5px] text-fg-2">
                {row.name}
              </span>
              <span className="text-right text-xs tabular-nums text-fg-4">
                {row.requests.toLocaleString()}
              </span>
              <span className="text-right">
                <span
                  className="rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums"
                  style={{
                    color: row.errors > 0 ? "var(--red)" : "var(--dim)",
                    background:
                      row.errors > 0 ? "var(--red-tint)" : "transparent",
                  }}
                >
                  {row.errors}
                </span>
              </span>
              <span className="text-right text-xs tabular-nums text-dim">
                {fmtLatency(row.avgDurationMs)}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
