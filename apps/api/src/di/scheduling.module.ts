import {
  AcceptScheduleChangeProposalUseCase,
  CounterScheduleChangeProposalUseCase,
  CreateScheduleChangeRequestUseCase,
  GetScheduleChangeRequestUseCase,
  EditFixtureEncounterUseCase,
  GenerateCompetitionFixtureUseCase,
  GetCompetitionFixtureUseCase,
  ListScheduleChangeRequestsUseCase,
  MaterializeOfficialMatchesForEncounterUseCase,
  RejectScheduleChangeProposalUseCase,
  UpsertEncounterScheduleSnapshotUseCase,
  type EncounterMutationLockPort,
  type EncounterParticipantValidationPort,
  type EncounterScheduleRepository,
  type EncounterWindowReaderPort,
  type CompetitionFixtureSourcePort,
  type FixtureAuditPort,
  type FixturePlanRepository,
  type OfficialMatchRepository,
} from "@futrob/scheduling";
import type { CompetitionRepository } from "@futrob/competitions";
import type { AuthorizationPort, EventPublisherPort, TransactionPort } from "@futrob/shared-kernel";
import type { OfficialMatchSelectionRepository, OfficialResultRepository } from "@futrob/results";
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
  OfficialResultOccupancyGuard,
  PostgresFixtureAuditPort,
} from "@/adapters/scheduling/fixture-editing.adapters.ts";
import { CompetitionRescheduleRulesAdapter } from "@/adapters/scheduling/competition-reschedule-rules.adapter.ts";
import { CompetitionTimeZoneAdapter } from "@/adapters/scheduling/competition-time-zone.adapter.ts";
import {
  InMemoryScheduleChangeRequestRepository,
  PostgresScheduleChangeRequestRepository,
} from "@/adapters/scheduling/schedule-change-request.repository.ts";

export function createSchedulingModule(input: {
  readonly pool: Pool | undefined;
  readonly authorization: AuthorizationPort;
  readonly participants: EncounterParticipantValidationPort;
  readonly fixtureSource: CompetitionFixtureSourcePort;
  readonly eventPublisher: EventPublisherPort;
  readonly transaction: TransactionPort;
  readonly officialResults: Pick<OfficialResultRepository, "findApprovedByEncounter">;
  readonly officialSelections: Pick<OfficialMatchSelectionRepository, "findLatestByEncounter">;
  readonly encounterMutationLock: EncounterMutationLockPort;
  readonly competitions: Pick<CompetitionRepository, "findById">;
}) {
  const encounterStore = input.pool
    ? new PostgresEncounterScheduleRepository(input.pool)
    : new InMemoryEncounterScheduleRepository();
  const encounters: EncounterScheduleRepository = encounterStore;
  const encounterWindow: EncounterWindowReaderPort = encounterStore;
  const officialMatches: OfficialMatchRepository = input.pool
    ? new PostgresOfficialMatchRepository(input.pool)
    : new InMemoryOfficialMatchRepository();
  const fixturePlans: FixturePlanRepository = input.pool
    ? new PostgresFixturePlanRepository(input.pool)
    : new InMemoryFixturePlanRepository();
  const fixtureAudit: FixtureAuditPort = input.pool
    ? new PostgresFixtureAuditPort(input.pool)
    : new InMemoryFixtureAuditPort();
  const scheduleChangeRequests = input.pool
    ? new PostgresScheduleChangeRequestRepository(input.pool)
    : new InMemoryScheduleChangeRequestRepository();
  const clock = new SystemClock();
  const ids = new CryptoIdGenerator();
  const editGuard = new OfficialResultFixtureEditGuard(
    officialMatches,
    input.officialResults,
    input.officialSelections,
  );
  const rescheduleRules = new CompetitionRescheduleRulesAdapter({
    competitions: input.competitions,
    fixtures: fixturePlans,
    requests: scheduleChangeRequests,
  });
  const timeZones = new CompetitionTimeZoneAdapter(input.competitions);
  const negotiation = {
    authorization: input.authorization,
    clock,
    editGuard,
    encounters,
    ids,
    matches: officialMatches,
    mutationLock: input.encounterMutationLock,
    requests: scheduleChangeRequests,
    rules: rescheduleRules,
    transaction: input.transaction,
  };
  return {
    encounters,
    encounterWindow,
    officialMatches,
    fixturePlans,
    scheduleChangeRequests,
    generateFixture: new GenerateCompetitionFixtureUseCase({
      authorization: input.authorization,
      clock,
      encounters,
      eventPublisher: input.eventPublisher,
      fixtures: fixturePlans,
      matches: officialMatches,
      occupancy: new OfficialResultOccupancyGuard(input.officialResults),
      source: input.fixtureSource,
      transaction: input.transaction,
    }),
    editFixtureEncounter: new EditFixtureEncounterUseCase({
      authorization: input.authorization,
      audit: fixtureAudit,
      clock,
      editGuard,
      encounters,
      eventPublisher: input.eventPublisher,
      fixtures: fixturePlans,
      matches: officialMatches,
      mutationLock: input.encounterMutationLock,
      source: input.fixtureSource,
      transaction: input.transaction,
    }),
    createScheduleChangeRequest: new CreateScheduleChangeRequestUseCase({
      authorization: input.authorization,
      clock,
      editGuard,
      encounters,
      eventPublisher: input.eventPublisher,
      ids,
      matches: officialMatches,
      mutationLock: input.encounterMutationLock,
      requests: scheduleChangeRequests,
      rules: rescheduleRules,
      timeZones,
      transaction: input.transaction,
    }),
    acceptScheduleChangeProposal: new AcceptScheduleChangeProposalUseCase({
      ...negotiation,
      eventPublisher: input.eventPublisher,
      fixtures: fixturePlans,
    }),
    rejectScheduleChangeProposal: new RejectScheduleChangeProposalUseCase(negotiation),
    counterScheduleChangeProposal: new CounterScheduleChangeProposalUseCase({
      ...negotiation,
      timeZones,
    }),
    listScheduleChangeRequests: new ListScheduleChangeRequestsUseCase({
      authorization: input.authorization,
      encounters,
      requests: scheduleChangeRequests,
    }),
    getScheduleChangeRequest: new GetScheduleChangeRequestUseCase({
      authorization: input.authorization,
      encounters,
      requests: scheduleChangeRequests,
    }),
    getFixture: new GetCompetitionFixtureUseCase({
      authorization: input.authorization,
      fixtures: fixturePlans,
    }),
    upsertEncounterSchedule: new UpsertEncounterScheduleSnapshotUseCase({
      authorization: input.authorization,
      encounters,
      fixtureOwnership: fixturePlans,
      matches: officialMatches,
      mutationLock: input.encounterMutationLock,
      participants: input.participants,
      transaction: input.transaction,
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
