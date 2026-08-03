import { useEffect, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import SessionsTable from "../components/sessions/SessionsTable";
import { TableSkeleton } from "../components/ui/TableSkeleton";
import { useAgentSessionsQuery } from "../api";
import { useProject } from "../hooks/useProject";
import { summarizeApiAgentSession } from "../lib/agentSessions";

type DateRange = "all" | "24h" | "7d" | "30d";
type SessionSort = "recent" | "oldest" | "duration" | "errors" | "volume";
type PageSize = 15 | 25 | 50 | 100;
type SourceFilter =
  "" | "claude_code" | "codex" | "opencode" | "openclaw" | "sdk";

const SearchIcon = () => (
  <svg
    className="h-3.5 w-3.5 text-dim"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

function validRange(value: string | null): DateRange {
  return value === "24h" || value === "7d" || value === "30d" ? value : "all";
}

function validSort(value: string | null): SessionSort {
  return value === "oldest" ||
    value === "duration" ||
    value === "errors" ||
    value === "volume"
    ? value
    : "recent";
}

function validSourceFilter(value: string | null): SourceFilter {
  return value === "claude_code" ||
    value === "codex" ||
    value === "opencode" ||
    value === "openclaw" ||
    value === "sdk"
    ? value
    : "";
}

function validPage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function validPageSize(value: string | null): PageSize {
  const parsed = Number.parseInt(value ?? "", 10);
  return parsed === 25 || parsed === 50 || parsed === 100 ? parsed : 15;
}

function getDateRangeParams(range: DateRange): {
  date_from?: string;
  date_to?: string;
} {
  if (range === "all") return {};

  const from = new Date();
  if (range === "24h") {
    from.setHours(from.getHours() - 24);
  } else if (range === "7d") {
    from.setDate(from.getDate() - 7);
  } else {
    from.setDate(from.getDate() - 30);
  }

  return { date_from: from.toISOString() };
}

export default function Sessions() {
  const { selectedProject } = useProject();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const dateRange = validRange(searchParams.get("range"));
  const sort = validSort(searchParams.get("sort"));
  const source = validSourceFilter(searchParams.get("source"));
  const page = validPage(searchParams.get("page"));
  const pageSize = validPageSize(searchParams.get("pageSize"));
  const dateParams = useMemo(() => getDateRangeParams(dateRange), [dateRange]);

  useEffect(() => {
    if (!searchParams.has("tab")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("tab");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const sessionsQuery = useAgentSessionsQuery(
    "sessions-list",
    selectedProject?.id,
    {
      limit: pageSize,
      offset: (page - 1) * pageSize,
      sort,
      source: source || undefined,
      ...dateParams,
    },
  );

  const sessions =
    sessionsQuery.data?.sessions.map(summarizeApiAgentSession) ?? [];
  const total = sessionsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const loading = sessionsQuery.isPending;
  const error =
    sessionsQuery.error instanceof Error ? sessionsQuery.error.message : null;

  useEffect(() => {
    if (loading || error || page <= totalPages) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const next = new URLSearchParams(searchParams);
      if (totalPages === 1) next.delete("page");
      else next.set("page", String(totalPages));
      setSearchParams(next, { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [error, loading, page, searchParams, setSearchParams, totalPages]);

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return [
      s.agentName,
      s.displayName,
      s.subtitle,
      s.sessionId,
      s.shortId,
      s.sourceLabel,
      s.cwd,
      s.model,
    ].some((value) => value?.toLowerCase().includes(query));
  });

  const returnTo = `${location.pathname}${location.search}`;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-line bg-topbar px-5 backdrop-blur">
        <div className="flex items-center gap-3.5">
          <h1 className="text-[19px] font-semibold tracking-[-0.022em] text-fg">
            Sessions
          </h1>
          <span className="text-[12.5px] text-faint">
            {(searchQuery
              ? filteredSessions.length
              : total === 0
                ? 0
                : endItem - startItem + 1
            ).toLocaleString()}{" "}
            of {total.toLocaleString()} sessions
          </span>
        </div>
        <div className="flex w-[230px] flex-none items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-2.5 py-[7px]">
          <SearchIcon />
          <input
            type="search"
            aria-label="Search sessions"
            placeholder="Search agent, directory, model…"
            value={searchQuery}
            onChange={(event) =>
              updateSearchParams({
                q: event.target.value || null,
                page: null,
              })
            }
            className="w-full bg-transparent text-[12.5px] text-fg outline-none placeholder:text-faint"
          />
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1240px] p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-border bg-red-tint p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-red-text">{error}</p>
                <button
                  onClick={() => sessionsQuery.refetch()}
                  className="whitespace-nowrap text-sm text-blue hover:underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!error &&
            (loading ? (
              <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                <TableSkeleton rows={10} columns={7} />
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="rounded-2xl border border-line bg-surface p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-fill">
                  <svg
                    className="h-6 w-6 text-dim"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-sm font-medium text-fg-3">
                  {searchQuery && total > 0
                    ? "No matching sessions"
                    : "No Sessions"}
                </h3>
                <p className="mx-auto max-w-sm text-xs text-dim">
                  {searchQuery && total > 0
                    ? "No sessions on this page match your search."
                    : "Sessions with span data will appear here when available."}
                </p>
              </div>
            ) : (
              <>
                <SessionsTable
                  sessions={filteredSessions}
                  returnTo={returnTo}
                />
                {totalPages > 1 ? (
                  <div className="mt-3 flex items-center justify-between text-xs text-dim">
                    <div className="flex items-center gap-2">
                      <span>
                        {startItem.toLocaleString()}–{endItem.toLocaleString()}{" "}
                        of {total.toLocaleString()}
                      </span>
                      <select
                        value={pageSize}
                        onChange={(event) =>
                          updateSearchParams({
                            pageSize:
                              event.target.value === "15"
                                ? null
                                : event.target.value,
                            page: null,
                          })
                        }
                        className="rounded-lg border border-line bg-surface px-2 py-1 text-fg-4 outline-none focus:ring-1 focus:ring-blue/50"
                        aria-label="Sessions per page"
                      >
                        <option value={15}>15 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() =>
                          updateSearchParams({
                            page: page - 1 === 1 ? null : String(page - 1),
                          })
                        }
                        className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-fg-4 hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span>
                        Page {page.toLocaleString()} of{" "}
                        {totalPages.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() =>
                          updateSearchParams({ page: String(page + 1) })
                        }
                        className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-fg-4 hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ))}
        </div>
      </div>
    </div>
  );
}
