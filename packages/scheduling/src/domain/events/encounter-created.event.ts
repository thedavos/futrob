import type { DomainEvent } from "@futrob/shared-kernel";

export type EncounterCreatedEvent = DomainEvent<
  "scheduling.encounter-created",
  {
    readonly encounterId: string;
    readonly organizationId: string;
    readonly competitionId: string;
    readonly stageId: string;
    readonly roundId: string;
    readonly homeTeamId: string;
    readonly awayTeamId: string;
    readonly scheduledStartAt: string;
  }
>;
