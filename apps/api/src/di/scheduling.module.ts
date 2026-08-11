import {
  MaterializeOfficialMatchesForEncounterUseCase,
  UpsertEncounterScheduleSnapshotUseCase,
  type EncounterParticipantValidationPort,
  type EncounterScheduleRepository,
  type OfficialMatchRepository,
} from "@futrob/scheduling";
import type { AuthorizationPort } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import {
  InMemoryEncounterScheduleRepository,
  PostgresEncounterScheduleRepository,
} from "@/adapters/scheduling/encounter-schedule.repository.ts";
import {
  InMemoryOfficialMatchRepository,
  PostgresOfficialMatchRepository,
} from "@/adapters/scheduling/official-match.repository.ts";
import { CryptoIdGenerator, SystemClock } from "@/adapters/organizations/crypto-ports.ts";

export function createSchedulingModule(input: {
  readonly pool: Pool | undefined;
  readonly authorization: AuthorizationPort;
  readonly participants: EncounterParticipantValidationPort;
}) {
  const encounters: EncounterScheduleRepository = input.pool
    ? new PostgresEncounterScheduleRepository(input.pool)
    : new InMemoryEncounterScheduleRepository();
  const officialMatches: OfficialMatchRepository = input.pool
    ? new PostgresOfficialMatchRepository(input.pool)
    : new InMemoryOfficialMatchRepository();
  const clock = new SystemClock();
  const ids = new CryptoIdGenerator();
  return {
    encounters,
    officialMatches,
    upsertEncounterSchedule: new UpsertEncounterScheduleSnapshotUseCase({
      authorization: input.authorization,
      encounters,
      participants: input.participants,
    }),
    materializeOfficialMatches: new MaterializeOfficialMatchesForEncounterUseCase({
      authorization: input.authorization,
      clock,
      encounters,
      ids,
      matches: officialMatches,
    }),
  };
}

export type SchedulingModule = ReturnType<typeof createSchedulingModule>;
