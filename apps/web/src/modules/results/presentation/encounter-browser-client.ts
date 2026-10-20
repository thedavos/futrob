import {
  encounterViewSchema,
  listCompetitionEncountersResponseSchema,
  listEncounterCandidatesResponseSchema,
  type EncounterViewDto,
  type ListCompetitionEncountersResponse,
  type ListEncounterCandidatesResponse,
  type RequestId,
} from "@futrob/api-contracts";
import { requestBrowserJson } from "@/shared/infrastructure/http/browser-json-request.ts";

export class EncounterClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: RequestId,
  ) {
    super(code);
    this.name = "EncounterClientError";
  }
}

const createError = (status: number, error: { code: string; requestId?: RequestId }) =>
  new EncounterClientError(status, error.code, error.requestId);

export const encounterBrowserClient = {
  getEncounterView(organizationId: string, encounterId: string): Promise<EncounterViewDto> {
    return requestBrowserJson({
      path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/encounters/${encodeURIComponent(encounterId)}`,
      method: "GET",
      schema: encounterViewSchema,
      fallbackCode: "scheduling.encounter_load_failed",
      createError,
    });
  },
  listCompetitionEncounters(
    organizationId: string,
    competitionId: string,
  ): Promise<ListCompetitionEncountersResponse> {
    return requestBrowserJson({
      path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/encounters`,
      method: "GET",
      schema: listCompetitionEncountersResponseSchema,
      fallbackCode: "scheduling.encounters_load_failed",
      createError,
    });
  },
  listEncounterCandidates(encounterId: string): Promise<ListEncounterCandidatesResponse> {
    return requestBrowserJson({
      path: `/api/v1/encounters/${encodeURIComponent(encounterId)}/candidates`,
      method: "GET",
      schema: listEncounterCandidatesResponseSchema,
      fallbackCode: "results.candidates_load_failed",
      createError,
    });
  },
};
