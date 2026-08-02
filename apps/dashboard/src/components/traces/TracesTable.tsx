import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Trace } from "../../lib/apiClient";
import { StatusDot } from "../ui/StatusDot";
import { sourceLabel, sourceName } from "../../lib/sources";
import { fmtCost, fmtLatency, fmtTokens } from "../../lib/format";
import type { TraceRowDensity } from "../../lib/traceUiPrefs";

function latencyColor(ms: number, isError: boolean): string {
  if (isError) return "var(--red)";
  if (ms < 1500) return "var(--green)";
  if (ms < 4500) return "var(--blue)";
  return "var(--orange)";
}

function MeterCell({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex min-w-[92px] flex-col gap-1">
      <span className="text-sm tabular-nums" style={{ color: "var(--text-3)" }}>
        {label}
      </span>
      <span
        className="block h-[3px] w-full overflow-hidden rounded-full"
        style={{ background: "var(--track)" }}
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${pct.toFixed(0)}%`, background: color }}
        />
      </span>
    </div>
  );
}

function ServiceCell({ trace }: { trace: Trace }) {
  const services = trace.services ?? [];
  const label =
    services.length === 0
      ? "—"
      : services.length === 1
        ? services[0]
        : `${services.length} services`;
  const failed = trace.errorService;

  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="max-w-[140px] truncate text-sm"
        style={{ color: services.length ? "var(--text-3)" : "var(--faint)" }}
        title={services.join(", ")}
      >
        {label}
      </span>
      {failed && (
        <span
          className="max-w-[140px] truncate text-[11px]"
          style={{ color: "var(--red-text)" }}
          title={`First failure in ${failed}`}
        >
          {failed}
        </span>
      )}
    </div>
  );
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
  onRowClick?: (trace: Trace) => void;
  pagination?: PaginationProps;
}

type SortField =
  "timestamp" | "latencyMs" | "inputTokens" | "outputTokens" | "costCents";
type SortDirection = "asc" | "desc";

const SortIcon = ({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) => (
  <svg
    className={`w-3 h-3 ${active ? "text-accent" : ""}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    {active && direction === "desc" ? (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    ) : active && direction === "asc" ? (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 15l7-7 7 7"
      />
    ) : (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
      />
    )}
  </svg>
);

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return {
    display: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
    relative: getRelativeTime(date),
  };
};

const getRelativeTime = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60)
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

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
    <div className="bg-neutral-900 border-t border-neutral-800 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-sm text-neutral-500">
          {total > 0
            ? `${startItem}-${endItem} of ${total.toLocaleString()}`
            : "0 results"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm text-neutral-300 focus:outline-none focus:border-neutral-700"
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
          className="p-1.5 text-neutral-500 hover:text-white rounded hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
          title="First page"
        >
          <ChevronDoubleLeftIcon />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={isFirstPage}
          className="p-1.5 text-neutral-500 hover:text-white rounded hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
          title="Previous page"
        >
          <ChevronLeftIcon />
        </button>
        <span className="px-3 text-sm text-neutral-400">
          Page {page} of {totalPages > 0 ? totalPages.toLocaleString() : 1}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={isLastPage}
          className="p-1.5 text-neutral-500 hover:text-white rounded hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
          title="Next page"
        >
          <ChevronRightIcon />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={isLastPage}
          className="p-1.5 text-neutral-500 hover:text-white rounded hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
          title="Last page"
        >
          <ChevronDoubleRightIcon />
        </button>
      </div>
    </div>
  );
}

interface SortableHeaderProps {
  field: SortField;
  children: React.ReactNode;
  onSort: (field: SortField) => void;
  sortField: SortField;
  sortDirection: SortDirection;
}

function SortableHeader({
  field,
  children,
  onSort,
  sortField,
  sortDirection,
}: SortableHeaderProps) {
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-neutral-300"
    >
      {children}
      <SortIcon active={sortField === field} direction={sortDirection} />
    </button>
  );
}

export default function TracesTable({
  traces,
  rowDensity = "rich",
  onRowClick,
  pagination,
}: TracesTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedTraces = [...traces].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;

    switch (sortField) {
      case "timestamp":
        aVal = new Date(a.timestamp).getTime();
        bVal = new Date(b.timestamp).getTime();
        break;
      case "latencyMs":
        aVal = a.latencyMs ?? 0;
        bVal = b.latencyMs ?? 0;
        break;
      case "inputTokens":
        aVal = a.inputTokens ?? 0;
        bVal = b.inputTokens ?? 0;
        break;
      case "outputTokens":
        aVal = a.outputTokens ?? 0;
        bVal = b.outputTokens ?? 0;
        break;
      case "costCents":
        aVal = a.costCents ?? 0;
        bVal = b.costCents ?? 0;
        break;
    }

    if (sortDirection === "asc") {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    }
    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
  });

  const maxLatency = Math.max(0, ...traces.map((t) => t.latencyMs ?? 0));
  const rowPadding = rowDensity === "minimal" ? "py-1.5" : "py-2.5";

  const handleRowClick = (trace: Trace) => {
    setSelectedId(trace.traceId);
    if (onRowClick) {
      onRowClick(trace);
    } else {
      navigate(`/dashboard/traces/${trace.traceId}`);
    }
  };

  return (
    <div className="flex flex-col">
      <table className="w-full">
        <thead className="bg-neutral-900">
          <tr className="border-b border-neutral-800">
            <th className="text-left py-2.5 px-4 text-xs font-medium text-neutral-500">
              Source
            </th>
            <th className="text-left py-2.5 px-4 text-xs font-medium text-neutral-500">
              Trace ID
            </th>
            <th className="text-left py-2.5 px-4 text-xs font-medium text-neutral-500">
              <SortableHeader
                field="timestamp"
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              >
                Timestamp
              </SortableHeader>
            </th>
            <th className="text-left py-2.5 px-4 text-xs font-medium text-neutral-500">
              Summary
            </th>
            <th className="text-left py-2.5 px-4 text-xs font-medium text-neutral-500">
              Service
            </th>
            <th className="text-left py-2.5 px-4 text-xs font-medium text-neutral-500">
              Model
            </th>
            <th className="text-left py-2.5 px-4 text-xs font-medium text-neutral-500">
              Spans
            </th>
            <th className="text-left py-2.5 px-4 text-xs font-medium text-neutral-500">
              <SortableHeader
                field="inputTokens"
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              >
                Tokens
              </SortableHeader>
            </th>
            <th className="text-left py-2.5 px-4 text-xs font-medium text-neutral-500">
              <SortableHeader
                field="latencyMs"
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              >
                Latency
              </SortableHeader>
            </th>
            <th className="text-left py-2.5 px-4 text-xs font-medium text-neutral-500">
              <SortableHeader
                field="costCents"
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              >
                Cost
              </SortableHeader>
            </th>
            <th className="text-left py-2.5 px-4 text-xs font-medium text-neutral-500">
              Session
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTraces.map((trace) => {
            const { display, relative } = formatTimestamp(trace.timestamp);
            const isError = trace.status === "error";
            const isSelected = selectedId === trace.traceId;
            const totalTokens =
              (trace.inputTokens ?? 0) + (trace.outputTokens ?? 0);
            const model = trace.modelUsed ?? trace.modelRequested;

            return (
              <tr
                key={trace.traceId}
                onClick={() => handleRowClick(trace)}
                className="cursor-pointer border-b transition-colors"
                style={{
                  borderColor: "var(--border-soft)",
                  background: isSelected
                    ? "var(--blue-tint)"
                    : isError
                      ? "var(--red-tint)"
                      : "var(--surface)",
                }}
              >
                <td className={`px-4 ${rowPadding}`}>
                  <div className="flex items-center gap-2">
                    <StatusDot status={trace.status} />
                    <span
                      className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                      style={{
                        background: "var(--fill)",
                        color: "var(--text-4)",
                      }}
                      title={sourceName(trace.source)}
                    >
                      {sourceLabel(trace.source)}
                    </span>
                  </div>
                </td>
                <td className={`px-4 ${rowPadding}`}>
                  <span
                    className="inline-block max-w-[100px] truncate font-mono text-sm"
                    style={{ color: "var(--blue)" }}
                  >
                    {trace.traceId.slice(0, 12)}
                  </span>
                </td>
                <td className={`px-4 ${rowPadding}`}>
                  <div className="text-sm whitespace-nowrap">{display}</div>
                  {rowDensity === "rich" && (
                    <div className="text-xs" style={{ color: "var(--dim)" }}>
                      {relative}
                    </div>
                  )}
                </td>
                <td className={`px-4 ${rowPadding}`}>
                  <span
                    className="inline-block max-w-[280px] truncate text-sm"
                    style={{ color: "var(--text-3)" }}
                    title={trace.summary}
                  >
                    {trace.summary}
                  </span>
                </td>
                <td className={`px-4 ${rowPadding}`}>
                  <ServiceCell trace={trace} />
                </td>
                <td className={`px-4 ${rowPadding}`}>
                  <span
                    className="inline-block max-w-[120px] truncate text-sm"
                    title={model ?? undefined}
                    style={{ color: "var(--text-4)" }}
                  >
                    {model ?? "—"}
                  </span>
                </td>
                <td className={`px-4 ${rowPadding}`}>
                  <span className="text-sm" style={{ color: "var(--text-4)" }}>
                    {trace.spanCount}
                  </span>
                </td>
                <td className={`px-4 ${rowPadding}`}>
                  <MeterCell
                    label={fmtTokens(totalTokens)}
                    pct={Math.min((totalTokens / 7000) * 100, 100)}
                    color="var(--teal)"
                  />
                </td>
                <td className={`px-4 ${rowPadding}`}>
                  <MeterCell
                    label={fmtLatency(trace.latencyMs)}
                    pct={
                      maxLatency > 0
                        ? Math.min((trace.latencyMs / maxLatency) * 100, 100)
                        : 0
                    }
                    color={latencyColor(trace.latencyMs, isError)}
                  />
                </td>
                <td className={`px-4 ${rowPadding}`}>
                  <span
                    className="text-sm tabular-nums"
                    style={{ color: "var(--text-4)" }}
                  >
                    {fmtCost(trace.costCents)}
                  </span>
                </td>
                <td className={`px-4 ${rowPadding}`}>
                  {trace.sessionId ? (
                    <span
                      className="inline-block max-w-[80px] truncate font-mono text-xs"
                      style={{ color: "var(--dim)" }}
                    >
                      {trace.sessionId.slice(0, 10)}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--faint)" }}>
                      —
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
