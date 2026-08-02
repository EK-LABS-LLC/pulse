interface ToolUsageItem {
  name: string;
  count: number;
}

interface OverviewToolUsageProps {
  data: ToolUsageItem[];
  rangeLabel: string;
  maxItems?: number;
}

export function OverviewToolUsage({
  data,
  rangeLabel,
  maxItems = 5,
}: OverviewToolUsageProps) {
  const rows = [...data].sort((a, b) => b.count - a.count).slice(0, maxItems);
  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h3 className="text-sm font-semibold tracking-[-0.015em] text-fg">
        Tool usage
      </h3>
      <p className="mb-4 mt-0.5 text-xs text-dim">
        Calls by tool · {rangeLabel}
      </p>

      {rows.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-line-soft bg-surface-3 text-sm text-dim">
          No tool usage data
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((tool) => (
            <div key={tool.name}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="truncate font-mono text-[12.5px] text-fg-2">
                  {tool.name}
                </span>
                <span className="text-xs tabular-nums text-dim">
                  {tool.count.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-track">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(tool.count / maxCount) * 100}%`,
                    background: "var(--blue)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
