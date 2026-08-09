import {
  UpsertEncounterScheduleSnapshotUseCase,
  type EncounterParticipantValidationPort,
  type EncounterScheduleRepository,
} from "@futrob/scheduling";
import type { AuthorizationPort } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import {
  InMemoryEncounterScheduleRepository,
  PostgresEncounterScheduleRepository,
} from "@/adapters/scheduling/encounter-schedule.repository.ts";

export function createSchedulingModule(input: {
  readonly pool: Pool | undefined;
  readonly authorization: AuthorizationPort;
  readonly participants: EncounterParticipantValidationPort;
}) {
  const encounters: EncounterScheduleRepository = input.pool
    ? new PostgresEncounterScheduleRepository(input.pool)
    : new InMemoryEncounterScheduleRepository();
  return {
    encounters,
    upsertEncounterSchedule: new UpsertEncounterScheduleSnapshotUseCase({
      authorization: input.authorization,
      encounters,
      participants: input.participants,
    }),
  };
}

export type SchedulingModule = ReturnType<typeof createSchedulingModule>;
