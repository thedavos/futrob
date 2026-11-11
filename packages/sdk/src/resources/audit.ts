import {
  listOrganizationAuditQuerySchema,
  listOrganizationAuditResponseSchema,
  type ListOrganizationAuditQuery,
  type ListOrganizationAuditResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

export function createAuditResource(http: HttpClient) {
  return {
    async list(
      organizationId: string,
      query: ListOrganizationAuditQuery = {},
      options: RequestOptions = {},
    ): Promise<ListOrganizationAuditResponse> {
      const parsed = listOrganizationAuditQuerySchema.parse(query);
      const parameters = new URLSearchParams();
      for (const [key, value] of Object.entries(parsed)) {
        if (value !== undefined) parameters.set(key, String(value));
      }
      return http.request({
        path: `${apiPath("organizations", organizationId, "audit")}?${parameters}`,
        method: "GET",
        options,
        parse: (data) => listOrganizationAuditResponseSchema.parse(data),
      });
    },
  };
}
export type AuditResource = ReturnType<typeof createAuditResource>;
