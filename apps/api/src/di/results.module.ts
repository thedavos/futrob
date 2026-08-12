import {
  ConfirmOfficialSelectionUseCase,
  SelectOfficialMatchesUseCase,
  type EncounterReaderPort,
  type OfficialMatchSelectionRepository,
  type OfficialResultReaderPort,
  type OfficialResultRepository,
  type ProviderMatchReaderPort,
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
import { CryptoIdGenerator, SystemClock } from "@/adapters/organizations/crypto-ports.ts";

export function createResultsModule(input: {
  readonly pool: Pool | undefined;
  readonly authorization: AuthorizationPort;
  readonly eventPublisher: EventPublisherPort;
  readonly encounterReader: EncounterReaderPort;
  readonly providerMatches: ProviderMatchReaderPort;
  readonly results?: OfficialResultRepository;
  readonly selections?: OfficialMatchSelectionRepository;
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

  const officialResultReader: OfficialResultReaderPort = {
    getApprovedByEncounter: (encounterId) => results.findApprovedByEncounter(encounterId),
    getById: (officialResultId) => results.findById(officialResultId),
  };

  return {
    selections,
    results,
    officialResultReader,
    selectOfficialMatches: new SelectOfficialMatchesUseCase({
      encounterReader: input.encounterReader,
      selections,
      eventPublisher: input.eventPublisher,
      authorization: input.authorization,
      ids,
      clock,
    }),
    confirmOfficialSelection: new ConfirmOfficialSelectionUseCase({
      encounterReader: input.encounterReader,
      selections,
      results,
      providerMatches: input.providerMatches,
      eventPublisher: input.eventPublisher,
      authorization: input.authorization,
      ids,
      clock,
    }),
  };
}

export type ResultsModule = ReturnType<typeof createResultsModule>;
