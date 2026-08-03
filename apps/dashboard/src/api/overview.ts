import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getOverviewExtended,
  type GetOverviewExtendedParams,
} from "../lib/apiClient";

export function useOverviewExtendedQuery(
  scope: string,
  projectId: string | undefined,
  params: GetOverviewExtendedParams,
) {
  return useQuery({
    queryKey: [
      scope,
      projectId,
      "overview-extended",
      params.date_from,
      params.date_to,
      params.group_by,
      params.measure,
      params.split_by,
    ],
    enabled: !!projectId,
    queryFn: async () => ({
      ...(await getOverviewExtended(params)),
      query: {
        group_by: params.group_by,
        measure: params.measure,
        split_by: params.split_by,
      },
    }),
    placeholderData: keepPreviousData,
    // The stub returns empty on 404; avoid noisy retries until the route exists.
    retry: false,
  });
}
