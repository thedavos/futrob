import type { OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { EncounterScheduleSnapshot } from "../entities/encounter-schedule-snapshot.ts";

export interface EncounterWindowReaderPort {
  listByOrganizationTeamsAndWindow(input: {
    readonly organizationId: OrganizationId;
    readonly teamIds: readonly TeamId[];
    readonly from: Date;
    readonly to: Date;
  }): Promise<readonly EncounterScheduleSnapshot[]>;
}
