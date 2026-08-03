export interface DashboardReturnTarget {
  to: string;
  label: "Overview" | "Traces" | "Sessions" | "Analytics";
}

const DEFAULT_TRACE_RETURN: DashboardReturnTarget = {
  to: "/dashboard/traces",
  label: "Traces",
};

const DEFAULT_SESSION_RETURN: DashboardReturnTarget = {
  to: "/dashboard/sessions",
  label: "Sessions",
};

function routeLabel(pathname: string): DashboardReturnTarget["label"] | null {
  if (pathname === "/dashboard") return "Overview";
  if (pathname === "/dashboard/traces") return "Traces";
  if (
    pathname === "/dashboard/sessions" ||
    pathname.startsWith("/dashboard/sessions/")
  ) {
    return "Sessions";
  }
  if (pathname === "/dashboard/analytics") return "Analytics";
  return null;
}

function validatedDashboardTarget(
  value: unknown,
): DashboardReturnTarget | null {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return null;
  }

  const url = new URL(value, "https://pulse.local");
  const label = routeLabel(url.pathname);
  if (!label) return null;
  return { to: `${url.pathname}${url.search}${url.hash}`, label };
}

function detailPath(pathname: string, returnTo: string): string {
  const target = validatedDashboardTarget(returnTo);
  const params = new URLSearchParams();
  if (target) params.set("from", target.to);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function buildTraceDetailPath(
  traceId: string,
  returnTo: string,
): string {
  return detailPath(
    `/dashboard/traces/${encodeURIComponent(traceId)}`,
    returnTo,
  );
}

export function buildSessionDetailPath(
  sessionId: string,
  returnTo: string,
): string {
  return detailPath(
    `/dashboard/sessions/${encodeURIComponent(sessionId)}`,
    returnTo,
  );
}

export function resolveTraceReturnTarget(
  value: unknown,
): DashboardReturnTarget {
  return validatedDashboardTarget(value) ?? DEFAULT_TRACE_RETURN;
}

export function resolveSessionReturnTarget(
  value: unknown,
): DashboardReturnTarget {
  return validatedDashboardTarget(value) ?? DEFAULT_SESSION_RETURN;
}
