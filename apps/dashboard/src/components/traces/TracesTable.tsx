import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Trace } from "../../lib/apiClient";
import { buildTraceDetailPath } from "../../lib/dashboardNavigation";
import { fmtCost, fmtLatency, fmtRel, fmtTokens } from "../../lib/format";
import type { TraceRowDensity } from "../../lib/traceUiPrefs";

function latencyColor(ms: number, isError: boolean): string {
  if (isError) return "var(--red)";
  if (ms < 1500) return "var(--green)";
  if (ms < 4500) return "var(--blue)";
  return "var(--orange)";
}

function serviceLabel(trace: Trace) {
  const services = trace.services ?? [];
  if (services.length === 0) return "No service";
  const first = services[0] ?? "No service";
  return services.length > 1 ? `${first} +${services.length - 1}` : first;
}

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

interface TracesTableProps {
  traces: Trace[];
  rowDensity?: TraceRowDensity;
  onRowDensityChange?: (density: TraceRowDensity) => void;
  onRowClick?: (trace: Trace) => void;
  pagination?: PaginationProps;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

const ChevronLeftIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 19l-7-7 7-7"
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </svg>
);

const ChevronDoubleLeftIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
    />
  </svg>
);

const ChevronDoubleRightIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 5l7 7-7 7M5 5l7 7-7 7"
    />
  </svg>
);

function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const isFirstPage = page === 1;
  const isLastPage = page >= totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="text-[11.5px] text-dim">
          {total > 0
            ? `${startItem}-${endItem} of ${total.toLocaleString()}`
            : "0 results"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] text-dim">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-line bg-surface-2 px-2 py-1 text-[11.5px] text-fg-3 focus:border-line-strong focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={isFirstPage}
          className="rounded-lg p-1.5 text-dim hover:bg-hover hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-dim"
          title="First page"
        >
          <ChevronDoubleLeftIcon />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={isFirstPage}
          className="rounded-lg p-1.5 text-dim hover:bg-hover hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-dim"
          title="Previous page"
        >
          <ChevronLeftIcon />
        </button>
        <span className="px-2 text-[11.5px] text-fg-4">
          Page {page} of {totalPages > 0 ? totalPages.toLocaleString() : 1}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={isLastPage}
          className="rounded-lg p-1.5 text-dim hover:bg-hover hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-dim"
          title="Next page"
        >
          <ChevronRightIcon />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={isLastPage}
          className="rounded-lg p-1.5 text-dim hover:bg-hover hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-dim"
          title="Last page"
        >
          <ChevronDoubleRightIcon />
        </button>
      </div>
    </div>
  );
}

export default function TracesTable({
  traces,
  rowDensity = "rich",
  onRowDensityChange,
  onRowClick,
  pagination,
}: TracesTableProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const maxLatency = Math.max(0, ...traces.map((t) => t.latencyMs ?? 0));
  const gridColumns = "12px 64px minmax(190px,1fr) 96px 112px 52px 14px";
  const rowPadding = rowDensity === "minimal" ? "py-1.5" : "py-2.5";

  const handleRowClick = (trace: Trace) => {
    setSelectedId(trace.traceId);
    if (onRowClick) {
      onRowClick(trace);
    } else {
      navigate(
        buildTraceDetailPath(
          trace.traceId,
          `${location.pathname}${location.search}`,
        ),
      );
    }
  };

  return (
    <div className="flex min-w-0 flex-col">
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[680px] items-center gap-2 border-b border-line px-3.5 py-2 text-[10.5px] font-semibold text-dim"
          style={{ gridTemplateColumns: gridColumns }}
        >
          <span />
          <span>Trace</span>
          <span>Summary</span>
          <span>Duration</span>
          <div className="flex items-center justify-between gap-2">
            <span>Usage</span>
            {onRowDensityChange ? (
              <span className="flex gap-0.5">
                {(["minimal", "rich"] as const).map((density) => (
                  <button
                    key={density}
                    type="button"
                    onClick={() => onRowDensityChange(density)}
                    className="cursor-pointer rounded-md border-0 px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      background:
                        rowDensity === density
                          ? "var(--fill-2)"
                          : "transparent",
                      color:
                        rowDensity === density ? "var(--text)" : "var(--dim)",
                    }}
                  >
                    {density === "minimal" ? "min" : "rich"}
                  </button>
                ))}
              </span>
            ) : null}
          </div>
          <span>Time</span>
          <span />
        </div>

        {traces.map((trace) => {
          const isError = trace.status === "error";
          const isSelected = selectedId === trace.traceId;
          const totalTokens =
            (trace.inputTokens ?? 0) + (trace.outputTokens ?? 0);
          const model = trace.modelUsed ?? trace.modelRequested;
          const service =
            isError && trace.errorService
              ? trace.errorService
              : serviceLabel(trace);
          const latencyPct =
            maxLatency > 0
              ? Math.min((trace.latencyMs / maxLatency) * 100, 100)
              : 0;

          return (
            <div
              key={trace.traceId}
              role="button"
              tabIndex={0}
              onClick={() => handleRowClick(trace)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleRowClick(trace);
                }
              }}
              className={`grid min-w-[680px] cursor-pointer items-center gap-2 border-b border-line-soft px-3.5 ${rowPadding} transition-colors hover:bg-hover`}
              style={{
                gridTemplateColumns: gridColumns,
                background: isSelected ? "var(--fill)" : undefined,
              }}
            >
              <span
                className="h-[5px] w-[5px] justify-self-center rounded-full"
                style={{
                  background: isError ? "var(--red)" : "var(--green)",
                }}
                title={trace.status}
              />

              <span
                className="truncate font-mono text-[11px] text-fg-4"
                title={trace.traceId}
              >
                {trace.traceId.slice(0, 8)}
              </span>

              <div className="min-w-0">
                <div
                  className="truncate text-[12.5px] text-fg"
                  title={trace.summary}
                >
                  {trace.summary || `Trace ${trace.traceId.slice(0, 8)}`}
                </div>
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                  <span
                    className={`max-w-[118px] shrink-0 truncate rounded-md px-1.5 py-0.5 font-mono text-[10px] ${
                      isError ? "bg-red-tint-2 text-red" : "bg-fill text-fg-4"
                    }`}
                    title={(trace.services ?? []).join(", ")}
                  >
                    {service}
                  </span>
                  {model ? (
                    <span
                      className="min-w-0 truncate font-mono text-[10.5px] text-faint"
                      title={model}
                    >
                      {model}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-rows-[4px_auto] gap-1 self-center">
                <div className="h-[4px] overflow-hidden rounded-full bg-track">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${latencyPct.toFixed(0)}%`,
                      background: latencyColor(trace.latencyMs, isError),
                    }}
                  />
                </div>
                <span
                  className={`text-[10.5px] tabular-nums ${
                    isError ? "text-red" : "text-dim"
                  }`}
                >
                  {fmtLatency(trace.latencyMs)}
                </span>
              </div>

              {rowDensity === "rich" ? (
                <div className="grid grid-rows-[4px_auto] gap-1 self-center">
                  <div className="h-[4px] overflow-hidden rounded-full bg-track">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue to-purple"
                      style={{
                        width: `${Math.min((totalTokens / 7000) * 100, 100).toFixed(0)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10.5px] tabular-nums text-dim">
                      {fmtTokens(totalTokens)}
                    </span>
                    <span className="text-[10.5px] tabular-nums text-fg-3">
                      {fmtCost(trace.costCents)}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-[10.5px] tabular-nums text-fg-3">
                    {fmtCost(trace.costCents)}
                  </div>
                  <div className="text-[10px] tabular-nums text-faint">
                    {fmtTokens(totalTokens)} tok
                  </div>
                </div>
              )}

              <span
                className="text-[10.5px] text-faint"
                title={new Date(trace.timestamp).toLocaleString()}
              >
                {fmtRel(trace.timestamp)}
              </span>

              <svg
                className="h-3.5 w-3.5 text-faint"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          );
        })}
      </div>
      {pagination && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      )}
    </div>
  );
}
