import { fmtLatency } from "../../lib/format";

export interface ServiceRow {
  service: string;
  requests: number;
  errors: number;
  avgDurationMs: number;
}

const COLUMNS = "minmax(130px,1fr) 96px 72px 60px 68px";

export function ServicesTable({
  services,
  selected,
  onSelect,
}: {
  services: ServiceRow[];
  selected: string | null;
  onSelect: (service: string | null) => void;
}) {
  if (services.length === 0) return null;

  const maxRequests = Math.max(...services.map((s) => s.requests), 1);
  const ordered = [...services].sort(
    (a, b) => b.errors - a.errors || b.requests - a.requests,
  );

  return (
    <div
      className="mb-5 overflow-hidden rounded-2xl"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="flex items-end justify-between px-4 py-3.5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div>
          <div className="text-sm font-semibold tracking-tight">Services</div>
          <div className="mt-0.5 text-xs" style={{ color: "var(--dim)" }}>
            Errors are attributed to the service that threw them
          </div>
        </div>
        <span className="text-xs" style={{ color: "var(--faint)" }}>
          {selected
            ? "Selected — click again to clear"
            : "Select a service to scope the query"}
        </span>
      </div>

      <div
        className="grid gap-2.5 px-4 py-2"
        style={{
          gridTemplateColumns: COLUMNS,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {["Service", "Volume", "Requests", "Errors", "Avg"].map((head) => (
          <span
            key={head}
            className="text-[11.5px]"
            style={{ color: "var(--dim)" }}
          >
            {head}
          </span>
        ))}
      </div>

      {ordered.map((row) => {
        const active = row.service === selected;
        return (
          <div
            key={row.service}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(active ? null : row.service)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(active ? null : row.service);
              }
            }}
            className="grid cursor-pointer items-center gap-2.5 px-4 py-2.5"
            style={{
              gridTemplateColumns: COLUMNS,
              borderBottom: "1px solid var(--border-soft)",
              background: active ? "var(--blue-tint)" : "transparent",
            }}
          >
            <span
              className="truncate font-mono text-[12.5px]"
              style={{ color: "var(--text)" }}
            >
              {row.service}
            </span>
            <span
              className="block h-[5px] overflow-hidden rounded-full"
              style={{ background: "var(--track)" }}
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${((row.requests / maxRequests) * 100).toFixed(0)}%`,
                  background: row.errors ? "var(--red)" : "var(--blue)",
                }}
              />
            </span>
            <span
              className="text-[12.5px] tabular-nums"
              style={{ color: "var(--text-3)" }}
            >
              {row.requests}
            </span>
            <span>
              <span
                className="rounded-md px-1.5 py-0.5 text-[12.5px] font-semibold tabular-nums"
                style={{
                  color: row.errors ? "var(--red)" : "var(--faint)",
                  background: row.errors ? "var(--red-tint-2)" : "transparent",
                }}
              >
                {row.errors}
              </span>
            </span>
            <span
              className="text-[12.5px] tabular-nums"
              style={{ color: "var(--dim)" }}
            >
              {fmtLatency(row.avgDurationMs)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
