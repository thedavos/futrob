import {
  EditFixtureEncounterUseCase,
  GenerateCompetitionFixtureUseCase,
  GetCompetitionFixtureUseCase,
  MaterializeOfficialMatchesForEncounterUseCase,
  UpsertEncounterScheduleSnapshotUseCase,
  type EncounterParticipantValidationPort,
  type EncounterScheduleRepository,
  type CompetitionFixtureSourcePort,
  type EditableFixturePlanRepository,
  type FixtureAuditPort,
  type FixtureEncounterOwnershipPort,
  type FixturePlanRepository,
  type OfficialMatchRepository,
} from "@futrob/scheduling";
import type {
  AuthorizationPort,
  EncounterMutationLockPort,
  EventPublisherPort,
  TransactionPort,
} from "@futrob/shared-kernel";
import type { OfficialResultRepository } from "@futrob/results";
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
import {
  InMemoryFixturePlanRepository,
  PostgresFixturePlanRepository,
} from "@/adapters/scheduling/fixture-plan.repository.ts";
import {
  InMemoryFixtureAuditPort,
  OfficialResultFixtureEditGuard,
  PostgresFixtureAuditPort,
} from "@/adapters/scheduling/fixture-editing.adapters.ts";

export function createSchedulingModule(input: {
  readonly pool: Pool | undefined;
  readonly authorization: AuthorizationPort;
  readonly participants: EncounterParticipantValidationPort;
  readonly fixtureSource: CompetitionFixtureSourcePort;
  readonly eventPublisher: EventPublisherPort;
  readonly transaction: TransactionPort;
  readonly officialResults: Pick<OfficialResultRepository, "findApprovedByEncounter">;
  readonly encounterMutationLock: EncounterMutationLockPort;
}) {
  const encounters: EncounterScheduleRepository = input.pool
    ? new PostgresEncounterScheduleRepository(input.pool)
    : new InMemoryEncounterScheduleRepository();
  const officialMatches: OfficialMatchRepository = input.pool
    ? new PostgresOfficialMatchRepository(input.pool)
    : new InMemoryOfficialMatchRepository();
  const fixturePlans: FixturePlanRepository &
    EditableFixturePlanRepository &
    FixtureEncounterOwnershipPort = input.pool
    ? new PostgresFixturePlanRepository(input.pool)
    : new InMemoryFixturePlanRepository(encounters, officialMatches);
  const fixtureAudit: FixtureAuditPort = input.pool
    ? new PostgresFixtureAuditPort(input.pool)
    : new InMemoryFixtureAuditPort();
  const clock = new SystemClock();
  const ids = new CryptoIdGenerator();
  return {
    encounters,
    officialMatches,
    fixturePlans,
    generateFixture: new GenerateCompetitionFixtureUseCase({
      authorization: input.authorization,
      clock,
      eventPublisher: input.eventPublisher,
      fixtures: fixturePlans,
      source: input.fixtureSource,
      transaction: input.transaction,
    }),
    editFixtureEncounter: new EditFixtureEncounterUseCase({
      authorization: input.authorization,
      audit: fixtureAudit,
      clock,
      editGuard: new OfficialResultFixtureEditGuard(officialMatches, input.officialResults),
      eventPublisher: input.eventPublisher,
      fixtures: fixturePlans,
      mutationLock: input.encounterMutationLock,
      source: input.fixtureSource,
      transaction: input.transaction,
    }),
    getFixture: new GetCompetitionFixtureUseCase({
      authorization: input.authorization,
      fixtures: fixturePlans,
    }),
    upsertEncounterSchedule: new UpsertEncounterScheduleSnapshotUseCase({
      authorization: input.authorization,
      encounters,
      fixtureOwnership: fixturePlans,
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
