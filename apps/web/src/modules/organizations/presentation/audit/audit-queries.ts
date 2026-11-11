import { useQuery } from "@tanstack/react-query";
import type { ListOrganizationAuditQuery } from "@futrob/api-contracts";
import { createFutrobClient, FutrobApiError, type FutrobClient } from "@futrob/sdk";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";

let client: FutrobClient | undefined;
function auditClient(): FutrobClient["audit"] {
  client ??= createFutrobClient({
    baseUrl: "/api/v1",
    fetchImpl: (input, init) => fetch(input, { ...init, credentials: "include" }),
  });
  return client.audit;
}

export function isAuditRefusal(error: Error | null): boolean {
  return (
    error instanceof FutrobApiError &&
    (error.status === 401 || error.status === 403 || error.status === 404)
  );
}

export function useOrganizationAuditQuery(
  organizationId: string,
  query: ListOrganizationAuditQuery,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.organizations.audit(organizationId, query),
    queryFn: ({ signal }) => auditClient().list(organizationId, query, { signal }),
    enabled,
    retry: (count, error) => !isAuditRefusal(error) && count < 2,
  });
}
