import type { TracesFilters } from "../../pages/Traces";
import { SOURCE_OPTIONS } from "../../lib/sources";

interface FilterSidebarProps {
  filters: TracesFilters;
  source: string;
  onSourceChange: (source: string) => void;
  counts: { status: Record<string, number>; source: Record<string, number> };
  collapsed: boolean;
  onToggle: () => void;
  onApplyFilters: (filters: TracesFilters) => void;
  onClearFilters: () => void;
}

interface Chip {
  value: string;
  label: string;
  count?: number;
}

function ChipGroup({
  title,
  chips,
  active,
  onPick,
}: {
  title: string;
  chips: Chip[];
  active: string;
  onPick: (value: string) => void;
}) {
  return (
    <div className="mb-3.5">
      <div
        className="mb-2 text-[11px] font-semibold"
        style={{ color: "var(--dim)" }}
      >
        {title}
      </div>
      <div className="flex flex-col gap-1">
        {chips.map((chip) => {
          const on = chip.value === active;
          return (
            <button
              key={chip.value || "all"}
              type="button"
              onClick={() => onPick(chip.value)}
              className="flex cursor-pointer items-center justify-between rounded-[7px] px-2 py-1 text-left text-[11.5px] transition-colors"
              style={{
                background: on ? "var(--filter-active)" : "transparent",
                border: on
                  ? "1px solid var(--filter-active-border)"
                  : "1px solid transparent",
                color: on ? "#fff" : "var(--text-3)",
              }}
            >
              <span>{chip.label}</span>
              {chip.count !== undefined && (
                <span className="tabular-nums opacity-70">{chip.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FilterSidebar({
  filters,
  source,
  onSourceChange,
  counts,
  collapsed,
  onToggle,
  onApplyFilters,
  onClearFilters,
}: FilterSidebarProps) {
  const update = (key: keyof TracesFilters, value: string) =>
    onApplyFilters({ ...filters, [key]: value });

  const hasActive = Boolean(source) || Object.values(filters).some(Boolean);

  return (
    <div
      className={`sticky top-0 shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        collapsed ? "w-9" : "w-[204px]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label="Show filters"
        aria-hidden={!collapsed}
        tabIndex={collapsed ? 0 : -1}
        className={`absolute left-0 top-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-[14px] transition-[opacity,transform] duration-200 ease-out ${
          collapsed
            ? "translate-x-0 opacity-100 delay-150"
            : "pointer-events-none -translate-x-1 opacity-0"
        }`}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--dim)",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M13 19l7-7-7-7M6 19l7-7-7-7" />
        </svg>
      </button>

      <aside
        aria-hidden={collapsed}
        inert={collapsed}
        className={`w-[204px] rounded-[20px] p-3.5 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          collapsed
            ? "pointer-events-none -translate-x-2 scale-[0.985] opacity-0"
            : "translate-x-0 scale-100 opacity-100 delay-75"
        }`}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="mb-3.5 flex items-center justify-between">
          <span
            className="text-[11px] font-semibold"
            style={{ color: "var(--text-3)" }}
          >
            Filters
          </span>
          <button
            type="button"
            onClick={onToggle}
            aria-label="Hide filters"
            className="cursor-pointer border-0 bg-transparent p-0.5"
            style={{ color: "var(--dim)" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <ChipGroup
          title="Status"
          active={filters.status}
          onPick={(value) => update("status", value)}
          chips={[
            { value: "", label: "All", count: counts.status.all },
            {
              value: "success",
              label: "Success",
              count: counts.status.success,
            },
            { value: "error", label: "Error", count: counts.status.error },
          ]}
        />

        <ChipGroup
          title="Source"
          active={source}
          onPick={onSourceChange}
          chips={[
            { value: "", label: "All", count: counts.status.all },
            ...SOURCE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.name,
              count: counts.source[option.value] ?? 0,
            })),
          ]}
        />

        <div className="mb-4">
          <div
            className="mb-2 text-[11px] font-semibold"
            style={{ color: "var(--dim)" }}
          >
            Model
          </div>
          <input
            type="text"
            value={filters.model}
            onChange={(event) => update("model", event.target.value)}
            placeholder="gpt-4o"
            className="w-full rounded-xl px-2 py-1.5 text-[12px] outline-none"
            style={{
              background: "var(--surface-3)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
        </div>

        <div className="mb-4">
          <div
            className="mb-2 text-[11px] font-semibold"
            style={{ color: "var(--dim)" }}
          >
            Session
          </div>
          <input
            type="text"
            value={filters.session_id}
            onChange={(event) => update("session_id", event.target.value)}
            placeholder="session id"
            className="w-full rounded-xl px-2 py-1.5 text-[12px] outline-none"
            style={{
              background: "var(--surface-3)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
        </div>

        {hasActive && (
          <button
            type="button"
            onClick={onClearFilters}
            className="w-full cursor-pointer rounded-xl border-0 py-1.5 text-[12px]"
            style={{ background: "var(--fill)", color: "var(--text-3)" }}
          >
            Clear all
          </button>
        )}
      </aside>
    </div>
  );
}
