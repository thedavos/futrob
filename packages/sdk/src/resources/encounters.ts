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
import type { HttpClient } from "../http.ts";

export function createEncountersResource(http: HttpClient) {
  return {
    async getScheduleSnapshot(encounterId: string): Promise<EncounterScheduleSnapshotDto> {
      return http.request({
        path: `/encounters/${encodeURIComponent(encounterId)}/schedule-snapshot`,
        method: "GET",
        parse: (data) => encounterScheduleSnapshotSchema.parse(data),
      });
    },
    async upsertScheduleSnapshot(
      encounterId: string,
      input: UpsertEncounterScheduleSnapshotRequest,
    ): Promise<EncounterScheduleSnapshotDto> {
      return http.request({
        path: `/encounters/${encodeURIComponent(encounterId)}/schedule-snapshot`,
        method: "PUT",
        body: upsertEncounterScheduleSnapshotRequestSchema.parse(input),
        parse: (data) => encounterScheduleSnapshotSchema.parse(data),
      });
    },
    async generateFixture(
      organizationId: string,
      competitionId: string,
      input: GenerateCompetitionFixtureRequest,
    ): Promise<FixturePlanDto> {
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/fixture`,
        method: "POST",
        body: generateCompetitionFixtureRequestSchema.parse(input),
        parse: (data) => fixturePlanSchema.parse(data),
      });
    },
    async getFixture(
      organizationId: string,
      competitionId: string,
      fixturePlanId: string,
    ): Promise<FixturePlanDto> {
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/fixtures/${encodeURIComponent(fixturePlanId)}`,
        method: "GET",
        parse: (data) => fixturePlanSchema.parse(data),
      });
    },
    async editFixtureEncounter(
      organizationId: string,
      competitionId: string,
      fixturePlanId: string,
      encounterId: string,
      input: EditFixtureEncounterRequest,
    ): Promise<FixturePlanDto> {
      const requestId = input.requestId ?? crypto.randomUUID();
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/fixtures/${encodeURIComponent(fixturePlanId)}/encounters/${encodeURIComponent(encounterId)}`,
        method: "PATCH",
        requestId,
        body: editFixtureEncounterRequestSchema.parse({ ...input, requestId }),
        parse: (data) => fixturePlanSchema.parse(data),
      });
    },
  };
}

export type EncountersResource = ReturnType<typeof createEncountersResource>;
