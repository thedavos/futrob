import {
  acceptScheduleChangeProposalRequestSchema,
  type AcceptScheduleChangeProposalRequest,
  counterScheduleChangeProposalRequestSchema,
  type CounterScheduleChangeProposalRequest,
  createScheduleChangeRequestSchema,
  type CreateScheduleChangeRequestBody,
  editFixtureEncounterRequestSchema,
  type EditFixtureEncounterRequest,
  encounterScheduleSnapshotSchema,
  type EncounterScheduleSnapshotDto,
  encounterViewSchema,
  type EncounterViewDto,
  fixturePlanSchema,
  type FixturePlanDto,
  generateCompetitionFixtureRequestSchema,
  listCompetitionEncountersResponseSchema,
  type ListCompetitionEncountersResponse,
  type GenerateCompetitionFixtureRequest,
  listScheduleChangeRequestsResponseSchema,
  type ListScheduleChangeRequestsResponse,
  resolveScheduleChangeRequestSchema,
  type ResolveScheduleChangeRequestBody,
  rejectScheduleChangeProposalRequestSchema,
  type RejectScheduleChangeProposalRequest,
  scheduleChangeCommandResponseSchema,
  type ScheduleChangeCommandResponse,
  scheduleChangeRequestSchema,
  type ScheduleChangeRequestDto,
  upsertEncounterScheduleSnapshotRequestSchema,
  type UpsertEncounterScheduleSnapshotRequest,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

export function createEncountersResource(http: HttpClient) {
  return {
    async getView(
      organizationId: string,
      encounterId: string,
      options: RequestOptions = {},
    ): Promise<EncounterViewDto> {
      return http.request({
        path: apiPath("organizations", organizationId, "encounters", encounterId),
        method: "GET",
        options,
        parse: (data) => encounterViewSchema.parse(data),
      });
    },
    async listByCompetition(
      organizationId: string,
      competitionId: string,
      options: RequestOptions = {},
    ): Promise<ListCompetitionEncountersResponse> {
      return http.request({
        path: apiPath("organizations", organizationId, "competitions", competitionId, "encounters"),
        method: "GET",
        options,
        parse: (data) => listCompetitionEncountersResponseSchema.parse(data),
      });
    },
    async getScheduleSnapshot(
      encounterId: string,
      options: RequestOptions = {},
    ): Promise<EncounterScheduleSnapshotDto> {
      return http.request({
        path: apiPath("encounters", encounterId, "schedule-snapshot"),
        method: "GET",
        options,
        parse: (data) => encounterScheduleSnapshotSchema.parse(data),
      });
    },
    async upsertScheduleSnapshot(
      encounterId: string,
      input: UpsertEncounterScheduleSnapshotRequest,
      options: RequestOptions = {},
    ): Promise<EncounterScheduleSnapshotDto> {
      return http.request({
        path: apiPath("encounters", encounterId, "schedule-snapshot"),
        method: "PUT",
        body: upsertEncounterScheduleSnapshotRequestSchema.parse(input),
        options,
        parse: (data) => encounterScheduleSnapshotSchema.parse(data),
      });
    },
    async generateFixture(
      organizationId: string,
      competitionId: string,
      input: GenerateCompetitionFixtureRequest,
      options: RequestOptions = {},
    ): Promise<FixturePlanDto> {
      return http.request({
        path: apiPath("organizations", organizationId, "competitions", competitionId, "fixture"),
        method: "POST",
        body: generateCompetitionFixtureRequestSchema.parse(input),
        options,
        parse: (data) => fixturePlanSchema.parse(data),
      });
    },
    async getFixture(
      organizationId: string,
      competitionId: string,
      fixturePlanId: string,
      options: RequestOptions = {},
    ): Promise<FixturePlanDto> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "fixtures",
          fixturePlanId,
        ),
        method: "GET",
        options,
        parse: (data) => fixturePlanSchema.parse(data),
      });
    },
    async editFixtureEncounter(
      organizationId: string,
      competitionId: string,
      fixturePlanId: string,
      encounterId: string,
      input: EditFixtureEncounterRequest,
      options: RequestOptions = {},
    ): Promise<FixturePlanDto> {
      const requestId = input.requestId ?? crypto.randomUUID();
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "fixtures",
          fixturePlanId,
          "encounters",
          encounterId,
        ),
        method: "PATCH",
        requestId,
        body: editFixtureEncounterRequestSchema.parse({ ...input, requestId }),
        options,
        parse: (data) => fixturePlanSchema.parse(data),
      });
    },
    async listScheduleChangeRequests(
      encounterId: string,
      options: RequestOptions = {},
    ): Promise<ListScheduleChangeRequestsResponse> {
      return http.request({
        path: apiPath("encounters", encounterId, "schedule-change-requests"),
        method: "GET",
        options,
        parse: (data) => listScheduleChangeRequestsResponseSchema.parse(data),
      });
    },
    async createScheduleChangeRequest(
      encounterId: string,
      input: CreateScheduleChangeRequestBody,
      options: RequestOptions = {},
    ): Promise<ScheduleChangeRequestDto> {
      return http.request({
        path: apiPath("encounters", encounterId, "schedule-change-requests"),
        method: "POST",
        body: createScheduleChangeRequestSchema.parse(input),
        options,
        parse: (data) => scheduleChangeRequestSchema.parse(data),
      });
    },
    async getScheduleChangeRequest(
      encounterId: string,
      requestId: string,
      options: RequestOptions = {},
    ): Promise<ScheduleChangeRequestDto> {
      return http.request({
        path: apiPath("encounters", encounterId, "schedule-change-requests", requestId),
        method: "GET",
        options,
        parse: (data) => scheduleChangeRequestSchema.parse(data),
      });
    },
    async resolveScheduleChangeRequest(
      encounterId: string,
      requestId: string,
      input: ResolveScheduleChangeRequestBody,
      options: RequestOptions = {},
    ): Promise<ScheduleChangeCommandResponse> {
      return http.request({
        path: apiPath("encounters", encounterId, "schedule-change-requests", requestId, "resolve"),
        method: "POST",
        body: resolveScheduleChangeRequestSchema.parse(input),
        options,
        parse: (data) => scheduleChangeCommandResponseSchema.parse(data),
      });
    },
    async acceptScheduleChangeProposal(
      target: ScheduleChangeProposalTarget,
      input: AcceptScheduleChangeProposalRequest,
      options: RequestOptions = {},
    ): Promise<ScheduleChangeCommandResponse> {
      return http.request({
        path: proposalCommandPath(target, "accept"),
        method: "POST",
        body: acceptScheduleChangeProposalRequestSchema.parse(input),
        options,
        parse: (data) => scheduleChangeCommandResponseSchema.parse(data),
      });
    },
    async rejectScheduleChangeProposal(
      target: ScheduleChangeProposalTarget,
      input: RejectScheduleChangeProposalRequest,
      options: RequestOptions = {},
    ): Promise<ScheduleChangeCommandResponse> {
      return http.request({
        path: proposalCommandPath(target, "reject"),
        method: "POST",
        body: rejectScheduleChangeProposalRequestSchema.parse(input),
        options,
        parse: (data) => scheduleChangeCommandResponseSchema.parse(data),
      });
    },
    async counterScheduleChangeProposal(
      target: ScheduleChangeProposalTarget,
      input: CounterScheduleChangeProposalRequest,
      options: RequestOptions = {},
    ): Promise<ScheduleChangeCommandResponse> {
      return http.request({
        path: proposalCommandPath(target, "counter"),
        method: "POST",
        body: counterScheduleChangeProposalRequestSchema.parse(input),
        options,
        parse: (data) => scheduleChangeCommandResponseSchema.parse(data),
      });
    },
  };
}

/** The proposal a response command answers. */
export interface ScheduleChangeProposalTarget {
  readonly encounterId: string;
  readonly requestId: string;
  readonly proposalId: string;
}

function proposalCommandPath(
  target: ScheduleChangeProposalTarget,
  command: "accept" | "reject" | "counter",
): string {
  return apiPath(
    "encounters",
    target.encounterId,
    "schedule-change-requests",
    target.requestId,
    "proposals",
    target.proposalId,
    command,
  );
}

export type EncountersResource = ReturnType<typeof createEncountersResource>;
