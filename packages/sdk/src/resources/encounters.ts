import {
  editFixtureEncounterRequestSchema,
  type EditFixtureEncounterRequest,
  encounterScheduleSnapshotSchema,
  type EncounterScheduleSnapshotDto,
  fixturePlanSchema,
  type FixturePlanDto,
  generateCompetitionFixtureRequestSchema,
  type GenerateCompetitionFixtureRequest,
  upsertEncounterScheduleSnapshotRequestSchema,
  type UpsertEncounterScheduleSnapshotRequest,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

export function createEncountersResource(http: HttpClient) {
  return {
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
  };
}

export type EncountersResource = ReturnType<typeof createEncountersResource>;
