import {
  listEncounterCandidatesResponseSchema,
  type ListEncounterCandidatesResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

export function createResultsResource(http: HttpClient) {
  return {
    async listEncounterCandidates(
      encounterId: string,
      options: RequestOptions = {},
    ): Promise<ListEncounterCandidatesResponse> {
      return http.request({
        path: apiPath("encounters", encounterId, "candidates"),
        method: "GET",
        options,
        parse: (data) => listEncounterCandidatesResponseSchema.parse(data),
      });
    },
  };
}

export type ResultsResource = ReturnType<typeof createResultsResource>;
