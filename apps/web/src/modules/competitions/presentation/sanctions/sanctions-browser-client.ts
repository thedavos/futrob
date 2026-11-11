import {
  competitionSanctionSchema,
  listCompetitionSanctionsResponseSchema,
  type CompetitionSanctionDto,
  type ImposeSanctionRequest,
  type ListCompetitionSanctionsResponse,
  type RevokeSanctionRequest,
} from "@futrob/api-contracts";
import type { z } from "zod";
import { requestBrowserJson } from "@/shared/infrastructure/http/browser-json-request.ts";
import { CompetitionsClientError } from "../competitions-browser-client.ts";

function request<T>(
  path: string,
  method: "GET" | "POST",
  schema: z.ZodType<T>,
  body?: ImposeSanctionRequest | RevokeSanctionRequest,
): Promise<T> {
  return requestBrowserJson({
    path,
    method,
    body,
    schema,
    fallbackCode: "competitions.sanction_failed",
    createError: (status, error) => new CompetitionsClientError(status, error.code),
  });
}

function competitionPath(organizationId: string, competitionId: string, ...rest: string[]) {
  const tail = rest.map((segment) => `/${encodeURIComponent(segment)}`).join("");
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}${tail}`;
}

/** Browser calls to the sanctions BFF (ADR-0028). */
export const sanctionsBrowserClient = {
  list(organizationId: string, competitionId: string): Promise<ListCompetitionSanctionsResponse> {
    return request(
      competitionPath(organizationId, competitionId, "sanctions"),
      "GET",
      listCompetitionSanctionsResponseSchema,
    );
  },

  listForTeam(
    organizationId: string,
    competitionId: string,
    teamId: string,
  ): Promise<ListCompetitionSanctionsResponse> {
    return request(
      competitionPath(organizationId, competitionId, "teams", teamId, "sanctions"),
      "GET",
      listCompetitionSanctionsResponseSchema,
    );
  },

  impose(
    organizationId: string,
    competitionId: string,
    input: ImposeSanctionRequest,
  ): Promise<CompetitionSanctionDto> {
    return request(
      competitionPath(organizationId, competitionId, "sanctions"),
      "POST",
      competitionSanctionSchema,
      input,
    );
  },

  revoke(
    organizationId: string,
    competitionId: string,
    sanctionId: string,
    input: RevokeSanctionRequest,
  ): Promise<CompetitionSanctionDto> {
    return request(
      competitionPath(organizationId, competitionId, "sanctions", sanctionId, "revoke"),
      "POST",
      competitionSanctionSchema,
      input,
    );
  },
};

export type SanctionsBrowserClient = typeof sanctionsBrowserClient;
