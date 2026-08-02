import { type ReactNode, useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Trace, GetTracesParams } from "../lib/apiClient";
import {
  useTracesQuery,
  useAnalyticsQuery,
  useSpansAnalyticsQuery,
} from "../api";
import FilterSidebar from "../components/traces/FilterSidebar";
import { ServicesTable } from "../components/traces/ServicesTable";
import { StatCard } from "../components/ui/StatCard";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { fmtCost, fmtLatency } from "../lib/format";
import TracesTable from "../components/traces/TracesTable";
import TraceDetailPanel from "../components/traces/TraceDetailPanel";
import { TableSkeleton } from "../components/ui/TableSkeleton";
import { useProject } from "../hooks/useProject";
import {
  getTraceUiPrefs,
  setTraceUiPref,
  TRACE_UI_PREFS_EVENT,
  type TraceStatsMode,
} from "../lib/traceUiPrefs";

const RefreshIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const FilterIcon = () => (
  <svg
    className="h-4 w-4 text-dim"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
    />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    className="h-3.5 w-3.5 text-dim"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

type SourceFilter =
  "" | "claude_code" | "codex" | "opencode" | "openclaw" | "sdk";

const SOURCE_FILTER_LABELS: Record<SourceFilter, string> = {
  "": "All sources",
  claude_code: "Claude Code",
  codex: "Codex",
  opencode: "OpenCode",
  openclaw: "OpenClaw",
  sdk: "SDK",
};

function validSourceFilter(value: string | null): SourceFilter {
  return value === "claude_code" ||
    value === "codex" ||
    value === "opencode" ||
    value === "openclaw" ||
    value === "sdk"
    ? value
    : "";
}

interface ToolbarMenuProps<T extends string> {
  ariaLabel: string;
  icon: ReactNode;
  prefix?: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

function ToolbarMenu<T extends string>({
  ariaLabel,
  icon,
  prefix,
  value,
  options,
  onChange,
}: ToolbarMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="group inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 text-xs text-fg-3 transition-colors hover:border-line-strong hover:bg-hover focus:outline-none focus:ring-1 focus:ring-blue/50"
      >
        {icon}
        {prefix ? <span className="text-dim">{prefix}</span> : null}
        <span className="whitespace-nowrap text-fg-3">{selected?.label}</span>
        <span
          className={`text-dim transition-transform group-hover:text-fg-4 ${
            open ? "rotate-180" : ""
          }`}
        >
          <ChevronDownIcon />
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute right-0 top-full z-50 mt-1.5 min-w-full overflow-hidden rounded-lg border border-line bg-surface p-1 shadow-xl shadow-black/30"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-4 rounded-sm px-2.5 py-1.5 text-left text-sm transition-colors ${
                  active
                    ? "bg-fill text-fg"
                    : "text-fg-4 hover:bg-hover hover:text-fg-2"
                }`}
              >
                <span className="whitespace-nowrap">{option.label}</span>
                <span className={active ? "text-accent" : "text-transparent"}>
                  <CheckIcon />
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export interface TracesFilters {
  provider: string;
  model: string;
  status: string;
  date_from: string;
  date_to: string;
  session_id: string;
}

const defaultFilters: TracesFilters = {
  provider: "",
  model: "",
  status: "",
  date_from: "",
  date_to: "",
  session_id: "",
};

const DEFAULT_PAGE_SIZE = 25;

const toIsoDateRangeParam = (
  value: string,
  boundary: "start" | "end",
): string => {
  if (!value) return value;
  if (value.includes("T")) return value;
  if (boundary === "start") return `${value}T00:00:00.000Z`;
  return `${value}T23:59:59.999Z`;
};

export default function Traces() {
  const { selectedProject } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
  });

  const [pageSize, setPageSize] = useState(() => {
    const parsed = Number.parseInt(searchParams.get("pageSize") ?? "", 10);
    return parsed === 25 || parsed === 50 || parsed === 100
      ? parsed
      : DEFAULT_PAGE_SIZE;
  });

  const [filters, setFilters] = useState<TracesFilters>(() => ({
    provider: searchParams.get("provider") || "",
    model: searchParams.get("model") || "",
    status: searchParams.get("status") || "",
    date_from: searchParams.get("date_from") || "",
    date_to: searchParams.get("date_to") || "",
    session_id: searchParams.get("session_id") || "",
  }));

  const [source, setSource] = useState<SourceFilter>(() =>
    validSourceFilter(searchParams.get("source")),
  );

  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [serviceFilter, setServiceFilter] = useState<string | null>(() =>
    searchParams.get("service"),
  );
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [traceUiPrefs, setTraceUiPrefsState] = useState(getTraceUiPrefs);
  const statsMode = traceUiPrefs.statsMode;

  useEffect(() => {
    const syncTraceUiPrefs = () => setTraceUiPrefsState(getTraceUiPrefs());

    window.addEventListener("storage", syncTraceUiPrefs);
    window.addEventListener(TRACE_UI_PREFS_EVENT, syncTraceUiPrefs);
    window.addEventListener("focus", syncTraceUiPrefs);
    return () => {
      window.removeEventListener("storage", syncTraceUiPrefs);
      window.removeEventListener(TRACE_UI_PREFS_EVENT, syncTraceUiPrefs);
      window.removeEventListener("focus", syncTraceUiPrefs);
    };
  }, []);

  const queryParams = useMemo<GetTracesParams>(() => {
    const params: GetTracesParams = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
    };

    if (filters.provider) params.provider = filters.provider;
    if (filters.model) params.model = filters.model;
    if (filters.status) params.status = filters.status;
    if (filters.date_from)
      params.date_from = toIsoDateRangeParam(filters.date_from, "start");
    if (filters.date_to)
      params.date_to = toIsoDateRangeParam(filters.date_to, "end");
    if (filters.session_id) params.session_id = filters.session_id;
    if (source) params.source = source;
    if (serviceFilter) params.service = serviceFilter;

    return params;
  }, [filters, page, pageSize, source, serviceFilter]);

  const tracesQuery = useTracesQuery(
    "traces",
    selectedProject?.id,
    queryParams,
  );

  // Status chip counts need trace-level totals, which the list query only
  // reports for the active filter; these ask for the totals alone.
  const successCountQuery = useTracesQuery(
    "traces-count-success",
    selectedProject?.id,
    {
      ...queryParams,
      status: "success",
      limit: 1,
      offset: 0,
    },
  );
  const errorCountQuery = useTracesQuery(
    "traces-count-error",
    selectedProject?.id,
    {
      ...queryParams,
      status: "error",
      limit: 1,
      offset: 0,
    },
  );

  const STATS_WINDOW_DAYS = 7;
  const analyticsRange = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - STATS_WINDOW_DAYS * 86400000);
    return { date_from: from.toISOString(), date_to: to.toISOString() };
  }, []);

  const analyticsQuery = useAnalyticsQuery(
    "traces-analytics",
    selectedProject?.id,
    {
      ...analyticsRange,
      group_by: "day",
    },
  );
  const spansQuery = useSpansAnalyticsQuery(
    "traces-spans-analytics",
    selectedProject?.id,
    {
      ...analyticsRange,
      group_by: "day",
    },
  );

  const traces = tracesQuery.data?.traces ?? [];
  const total = tracesQuery.data?.total ?? 0;
  const loading = tracesQuery.isPending;
  const error =
    tracesQuery.error instanceof Error ? tracesQuery.error.message : null;

  const updateUrlParams = (
    newFilters: TracesFilters,
    newPage: number,
    newPageSize: number,
    newSource: SourceFilter,
  ) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    if (newSource) params.set("source", newSource);
    if (newPage > 1) params.set("page", String(newPage));
    if (newPageSize !== DEFAULT_PAGE_SIZE)
      params.set("pageSize", String(newPageSize));
    setSearchParams(params);
  };

  const applyFilters = (newFilters: TracesFilters) => {
    setFilters(newFilters);
    setPage(1);
    updateUrlParams(newFilters, 1, pageSize, source);
    setSelectedTrace(null);
  };

  const clearFilters = () => {
    applyFilters(defaultFilters);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrlParams(filters, newPage, pageSize, source);
    setSelectedTrace(null);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
    updateUrlParams(filters, 1, newPageSize, source);
    setSelectedTrace(null);
  };

  const handleSourceChange = (newSource: SourceFilter) => {
    setSource(newSource);
    setPage(1);
    updateUrlParams(filters, 1, pageSize, newSource);
    setSelectedTrace(null);
  };

  const handleRowClick = (trace: Trace) => {
    setSelectedTrace(trace);
  };

  const handleClosePanel = () => {
    setSelectedTrace(null);
  };

  const handleNavigateTrace = (direction: "prev" | "next") => {
    if (!selectedTrace) return;
    const currentIndex = traces.findIndex(
      (t) => t.traceId === selectedTrace.traceId,
    );
    if (currentIndex === -1) return;

    const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < traces.length) {
      setSelectedTrace(traces[newIndex] ?? null);
    }
  };

  const selectedTraceIndex = selectedTrace
    ? traces.findIndex((t) => t.traceId === selectedTrace.traceId)
    : -1;

  const analytics = analyticsQuery.data;
  const spansAnalytics = spansQuery.data;
  const serviceStats = spansAnalytics?.serviceStats ?? [];

  const statCards = [
    {
      label: "Requests",
      value: analytics ? analytics.totalRequests.toLocaleString() : "—",
      accent: "var(--blue)",
      series: (spansAnalytics?.spansOverTime ?? []).map((p) => p.count),
    },
    {
      label: "Error rate",
      value: spansAnalytics ? `${spansAnalytics.errorRate.toFixed(1)}%` : "—",
      accent: "var(--red)",
      series: [] as number[],
    },
    {
      label: "Avg latency",
      value: analytics ? fmtLatency(analytics.avgLatency) : "—",
      accent: "var(--purple)",
      series: [] as number[],
    },
    {
      label: "Cost",
      value: analytics ? fmtCost(analytics.totalCost) : "—",
      accent: "var(--orange)",
      series: [] as number[],
    },
  ];

  const chipCounts = {
    status: {
      all: total,
      success: successCountQuery.data?.total ?? 0,
      error: errorCountQuery.data?.total ?? 0,
    },
    source: {} as Record<string, number>,
  };

  const handleServiceSelect = (service: string | null) => {
    setServiceFilter(service);
    setPage(1);
    setSelectedTrace(null);
  };

  const handleStatsModeChange = (mode: TraceStatsMode) => {
    setTraceUiPref("statsMode", mode);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-line bg-topbar px-5 backdrop-blur">
        <div className="flex items-center gap-4">
          <h1 className="text-[19px] font-semibold tracking-[-0.022em] text-fg">
            Traces
          </h1>
          <span className="text-[12.5px] text-faint">
            {total.toLocaleString()} total
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ToolbarMenu
            ariaLabel="Source"
            icon={<FilterIcon />}
            prefix="Source:"
            value={source}
            options={(Object.keys(SOURCE_FILTER_LABELS) as SourceFilter[]).map(
              (value) => ({
                value,
                label: SOURCE_FILTER_LABELS[value],
              }),
            )}
            onChange={handleSourceChange}
          />
          <button
            type="button"
            aria-label="Refresh traces"
            onClick={() => tracesQuery.refetch()}
            disabled={loading || tracesQuery.isFetching}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-fg-4 transition-colors hover:bg-hover hover:text-fg disabled:opacity-50"
          >
            <span
              className={
                tracesQuery.isFetching ? "animate-spin inline-block" : ""
              }
            >
              <RefreshIcon />
            </span>
          </button>
          <div className="hidden items-center gap-1.5 px-1 py-1.5 text-xs text-dim sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            Live
          </div>
        </div>
      </header>

      <div className="relative flex-1 overflow-auto">
        <div className={selectedTrace ? "pr-[460px]" : ""}>
          <section className="px-5 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <span
                className="text-[11px] font-semibold"
                style={{ color: "var(--dim)" }}
              >
                Overview · last 7d
              </span>
              <SegmentedControl
                ariaLabel="Stats display"
                value={statsMode}
                onChange={handleStatsModeChange}
                options={[
                  { value: "trend", label: "Trend" },
                  { value: "compact", label: "Compact" },
                ]}
              />
            </div>

            {statsMode === "trend" ? (
              <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {statCards.map((card) => (
                  <StatCard
                    key={card.label}
                    label={card.label}
                    value={card.value}
                    accent={card.accent}
                    series={card.series}
                  />
                ))}
              </div>
            ) : (
              <div
                className="mb-5 flex flex-wrap overflow-hidden rounded-2xl"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                {statCards.map((card) => (
                  <div
                    key={card.label}
                    className="flex flex-1 items-center gap-2.5 px-4.5 py-3.5"
                    style={{ borderRight: "1px solid var(--border)" }}
                  >
                    <span className="text-xl font-semibold tabular-nums">
                      {card.value}
                    </span>
                    <span
                      className="text-[11.5px]"
                      style={{ color: "var(--dim)" }}
                    >
                      {card.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="px-5">
            <ServicesTable
              services={serviceStats}
              selected={serviceFilter}
              onSelect={handleServiceSelect}
            />
          </section>

          <section className="flex items-start gap-4 px-5 pb-6">
            <FilterSidebar
              filters={filters}
              source={source}
              onSourceChange={(value) =>
                handleSourceChange(value as typeof source)
              }
              counts={chipCounts}
              collapsed={!filtersOpen}
              onToggle={() => setFiltersOpen((open) => !open)}
              onApplyFilters={applyFilters}
              onClearFilters={clearFilters}
            />

            <div className="min-w-0 flex-1">
              {error && (
                <div
                  className="mb-4 rounded-xl p-4"
                  style={{
                    background: "var(--red-tint)",
                    border: "1px solid var(--red-border)",
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm" style={{ color: "var(--red-text)" }}>
                      {error}
                    </p>
                    <button
                      onClick={() => tracesQuery.refetch()}
                      className="cursor-pointer border-0 bg-transparent text-sm whitespace-nowrap"
                      style={{ color: "var(--blue)" }}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {loading ? (
                <div
                  className="overflow-hidden rounded-2xl"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <TableSkeleton rows={pageSize} columns={11} />
                </div>
              ) : traces.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center rounded-2xl py-12 text-center"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <h3
                    className="mb-1 text-sm font-medium"
                    style={{ color: "var(--text-4)" }}
                  >
                    No traces found
                  </h3>
                  <p className="text-xs" style={{ color: "var(--dim)" }}>
                    Try adjusting your filters or check back later
                  </p>
                </div>
              ) : (
                <div
                  className="overflow-hidden rounded-2xl"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <TracesTable
                    traces={traces}
                    rowDensity={traceUiPrefs.rowDensity}
                    onRowClick={handleRowClick}
                    pagination={{
                      page,
                      pageSize,
                      total,
                      onPageChange: handlePageChange,
                      onPageSizeChange: handlePageSizeChange,
                    }}
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        {selectedTrace && (
          <TraceDetailPanel
            trace={selectedTrace}
            onClose={handleClosePanel}
            onNavigate={handleNavigateTrace}
            hasPrev={selectedTraceIndex > 0}
            hasNext={selectedTraceIndex < traces.length - 1}
          />
        )}
      </div>
    </div>
  );
}
