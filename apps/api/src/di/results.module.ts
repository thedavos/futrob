import {
  AssociateEncounterCandidatesUseCase,
  ConfirmOfficialSelectionUseCase,
  GetOfficialSelectionUseCase,
  ListEncounterCandidatesUseCase,
  OpenMatchDisputeUseCase,
  ProposeAlternativeOfficialSelectionUseCase,
  RecalculateEncounterCandidatesUseCase,
  RejectOfficialSelectionUseCase,
  ResolveMatchDisputeUseCase,
  ReviewMatchDisputeUseCase,
  SelectOfficialMatchesUseCase,
  VoidOfficialResultUseCase,
  type EncounterCandidateAssociationRepository,
  type EncounterReaderPort,
  type OfficialMatchSelectionRepository,
  type OfficialResultReaderPort,
  type OfficialResultRepository,
  type ProviderMatchReaderPort,
  type TeamRepresentationPort,
} from "@futrob/results";
import type {
  AuthorizationPort,
  ClockPort,
  EventPublisherPort,
  IdGeneratorPort,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import {
  InMemoryOfficialMatchSelectionRepository,
  InMemoryOfficialResultRepository,
  PostgresOfficialMatchSelectionRepository,
  PostgresOfficialResultRepository,
} from "@/adapters/results/official-result.repository.ts";
import {
  InMemoryEncounterCandidateAssociationRepository,
  PostgresEncounterCandidateAssociationRepository,
} from "@/adapters/results/encounter-candidate-association.repository.ts";
import { CryptoIdGenerator, SystemClock } from "@/adapters/organizations/crypto-ports.ts";

export function createResultsModule(input: {
  readonly pool: Pool | undefined;
  readonly authorization: AuthorizationPort;
  readonly eventPublisher: EventPublisherPort;
  readonly encounterReader: EncounterReaderPort;
  readonly providerMatches: ProviderMatchReaderPort;
  readonly teamRepresentation: TeamRepresentationPort;
  readonly results?: OfficialResultRepository;
  readonly selections?: OfficialMatchSelectionRepository;
  readonly associations?: EncounterCandidateAssociationRepository;
  readonly clock?: ClockPort;
  readonly ids?: IdGeneratorPort;
}) {
  const clock = input.clock ?? new SystemClock();
  const ids = input.ids ?? new CryptoIdGenerator();
  const selections: OfficialMatchSelectionRepository =
    input.selections ??
    (input.pool
      ? new PostgresOfficialMatchSelectionRepository(input.pool)
      : new InMemoryOfficialMatchSelectionRepository());
  const results: OfficialResultRepository =
    input.results ??
    (input.pool
      ? new PostgresOfficialResultRepository(input.pool)
      : new InMemoryOfficialResultRepository());
  const associations: EncounterCandidateAssociationRepository =
    input.associations ??
    (input.pool
      ? new PostgresEncounterCandidateAssociationRepository(input.pool)
      : new InMemoryEncounterCandidateAssociationRepository());

  const officialResultReader: OfficialResultReaderPort = {
    getApprovedByEncounter: (encounterId) => results.findApprovedByEncounter(encounterId),
    getLatestByEncounter: (encounterId) => results.findLatestByEncounter(encounterId),
    getById: (officialResultId) => results.findById(officialResultId),
    listByCompetition: (competitionId) => results.listByCompetition(competitionId),
  };

  const selectionDeps = {
    encounterReader: input.encounterReader,
    selections,
    results,
    associations,
    eventPublisher: input.eventPublisher,
    authorization: input.authorization,
    ids,
    clock,
  };
  const partyDeps = { teamRepresentation: input.teamRepresentation };

  return {
    selections,
    results,
    associations,
    officialResultReader,
    listEncounterCandidates: new ListEncounterCandidatesUseCase({
      encounterReader: input.encounterReader,
      providerMatches: input.providerMatches,
      authorization: input.authorization,
    }),
    associateEncounterCandidates: new AssociateEncounterCandidatesUseCase({
      encounterReader: input.encounterReader,
      providerMatches: input.providerMatches,
      associations,
      clock,
    }),
    recalculateEncounterCandidates: new RecalculateEncounterCandidatesUseCase({
      encounterReader: input.encounterReader,
      providerMatches: input.providerMatches,
      associations,
      clock,
    }),
    selectOfficialMatches: new SelectOfficialMatchesUseCase({ ...selectionDeps, ...partyDeps }),
    confirmOfficialSelection: new ConfirmOfficialSelectionUseCase({
      ...selectionDeps,
      ...partyDeps,
      providerMatches: input.providerMatches,
    }),
    rejectOfficialSelection: new RejectOfficialSelectionUseCase({ ...selectionDeps, ...partyDeps }),
    proposeAlternativeOfficialSelection: new ProposeAlternativeOfficialSelectionUseCase({
      ...selectionDeps,
      ...partyDeps,
      providerMatches: input.providerMatches,
    }),
    openMatchDispute: new OpenMatchDisputeUseCase({ ...selectionDeps, ...partyDeps }),
    reviewMatchDispute: new ReviewMatchDisputeUseCase(selectionDeps),
    resolveMatchDispute: new ResolveMatchDisputeUseCase({
      ...selectionDeps,
      providerMatches: input.providerMatches,
    }),
    getOfficialSelection: new GetOfficialSelectionUseCase({ ...selectionDeps, ...partyDeps }),
    voidOfficialResult: new VoidOfficialResultUseCase({
      results,
      selections,
      eventPublisher: input.eventPublisher,
      authorization: input.authorization,
      ids,
      clock,
    }),
  };
}

export type ResultsModule = ReturnType<typeof createResultsModule>;
