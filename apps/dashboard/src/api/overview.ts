import { useQuery } from "@tanstack/react-query";
import { getOverviewExtended, type GetAnalyticsParams } from "../lib/apiClient";

export function useOverviewExtendedQuery(
  scope: string,
  projectId: string | undefined,
  params: GetAnalyticsParams,
) {
  return useQuery({
    queryKey: [
      scope,
      projectId,
      "overview-extended",
      params.date_from,
      params.date_to,
      params.group_by,
    ],
    enabled: !!projectId,
    queryFn: () => getOverviewExtended(params),
    // The stub returns empty on 404; avoid noisy retries until the route exists.
    retry: false,
  });
}
