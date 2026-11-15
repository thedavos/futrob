import {
  competitionSanctionSchema,
  imposeSanctionRequestSchema,
  listCompetitionSanctionsResponseSchema,
  revokeSanctionRequestSchema,
  type CompetitionSanctionDto,
  type ImposeSanctionRequest,
  type ListCompetitionSanctionsResponse,
  type RevokeSanctionRequest,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

/**
 * Competition sanctions (ADR-0028). Organizer and staff list, impose and revoke; the
 * affected Team reads its own. There is no edit or delete: a sanction is revoked.
 */
export function createSanctionsResource(http: HttpClient) {
  function competition(organizationId: string, competitionId: string, ...rest: string[]) {
    return apiPath("organizations", organizationId, "competitions", competitionId, ...rest);
  }

  return {
    async list(
      organizationId: string,
      competitionId: string,
      options: RequestOptions = {},
    ): Promise<ListCompetitionSanctionsResponse> {
      return http.request({
        path: competition(organizationId, competitionId, "sanctions"),
        method: "GET",
        options,
        parse: (data) => listCompetitionSanctionsResponseSchema.parse(data),
      });
    },

    async listForTeam(
      organizationId: string,
      competitionId: string,
      teamId: string,
      options: RequestOptions = {},
    ): Promise<ListCompetitionSanctionsResponse> {
      return http.request({
        path: competition(organizationId, competitionId, "teams", teamId, "sanctions"),
        method: "GET",
        options,
        parse: (data) => listCompetitionSanctionsResponseSchema.parse(data),
      });
    },

    async impose(
      organizationId: string,
      competitionId: string,
      input: ImposeSanctionRequest,
      options: RequestOptions = {},
    ): Promise<CompetitionSanctionDto> {
      const body = imposeSanctionRequestSchema.parse(input);
      return http.request({
        path: competition(organizationId, competitionId, "sanctions"),
        method: "POST",
        body,
        options,
        parse: (data) => competitionSanctionSchema.parse(data),
      });
    },

    async revoke(
      organizationId: string,
      competitionId: string,
      sanctionId: string,
      input: RevokeSanctionRequest,
      options: RequestOptions = {},
    ): Promise<CompetitionSanctionDto> {
      const body = revokeSanctionRequestSchema.parse(input);
      return http.request({
        path: competition(organizationId, competitionId, "sanctions", sanctionId, "revoke"),
        method: "POST",
        body,
        options,
        parse: (data) => competitionSanctionSchema.parse(data),
      });
    },
  };
}

export type SanctionsResource = ReturnType<typeof createSanctionsResource>;
