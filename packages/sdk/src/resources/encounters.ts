import {
  encounterScheduleSnapshotSchema,
  type EncounterScheduleSnapshotDto,
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
  };
}

export type EncountersResource = ReturnType<typeof createEncountersResource>;
