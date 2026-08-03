interface MetricItem {
  label: string;
  value: string;
  sub?: string;
}

interface OverviewMetricStripProps {
  metrics: MetricItem[];
}

export function OverviewMetricStrip({ metrics }: OverviewMetricStripProps) {
  return (
    <section className="flex overflow-hidden rounded-[18px] border border-line bg-surface">
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          className={`min-w-0 flex-1 px-4 py-3 ${
            index < metrics.length - 1 ? "border-r border-line" : ""
          }`}
        >
          <div className="mb-1 text-[11.5px] text-dim">{metric.label}</div>
          <div className="text-lg font-semibold tracking-[-0.02em] tabular-nums text-fg">
            {metric.value}
          </div>
          {metric.sub ? (
            <div className="mt-0.5 text-[11px] text-faint">{metric.sub}</div>
          ) : null}
        </div>
      ))}
    </section>
  );
}
