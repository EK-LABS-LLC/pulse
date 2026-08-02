export type TimeRange = "24h" | "7d" | "30d";
export type TimeRangeSelection = TimeRange | "custom";

interface TimeRangeTabsProps {
  value: TimeRangeSelection;
  onChange: (range: TimeRange) => void;
}

const tabs: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

export function TimeRangeTabs({ value, onChange }: TimeRangeTabsProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-[10px] border border-line-strong bg-surface-2 p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`rounded-[7px] px-3 py-1 text-[11.5px] transition-colors ${
            value === tab.value
              ? "bg-fill-2 text-fg"
              : "text-dim hover:bg-hover hover:text-fg-3"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
