import {
  ConfirmOfficialSelectionUseCase,
  SelectOfficialMatchesUseCase,
  type EncounterReaderPort,
  type OfficialMatchSelectionRepository,
  type OfficialResultRepository,
  type ProviderMatchReaderPort,
} from "@futrob/results";
import type { EventPublisherPort } from "@/shared/application/event-publisher.ts";
import type { AuthorizationPort } from "@futrob/shared-kernel";

class MemorySelections implements OfficialMatchSelectionRepository {
  async save(selection: Parameters<OfficialMatchSelectionRepository["save"]>[0]) {
    return selection;
  }
  async findLatestByEncounter() {
    return null;
  }
}

class MemoryResults implements OfficialResultRepository {
  async save(result: Parameters<OfficialResultRepository["save"]>[0]) {
    return result;
  }
  async findApprovedByEncounter() {
    return null;
  }
  async findLatestByEncounter() {
    return null;
  }
  async findById() {
    return null;
  }
  async listByCompetition() {
    return [];
  }
}

class EmptyProviderMatches implements ProviderMatchReaderPort {
  async listCandidatesForEncounter() {
    return [];
  }
  async getByExternalRef() {
    return null;
  }
}

export interface ResultsModuleDependencies {
  readonly encounterReader: EncounterReaderPort;
  readonly eventPublisher: EventPublisherPort;
  readonly authorization: AuthorizationPort;
}

export function createResultsModule(deps: ResultsModuleDependencies) {
  const selections = new MemorySelections();
  const results = new MemoryResults();
  const clock = { now: () => new Date() };
  const ids = { generate: () => crypto.randomUUID() };
  return {
    selectOfficialMatches: new SelectOfficialMatchesUseCase({
      encounterReader: deps.encounterReader,
      selections,
      eventPublisher: deps.eventPublisher,
      authorization: deps.authorization,
      ids,
      clock,
    }),
    confirmOfficialSelection: new ConfirmOfficialSelectionUseCase({
      encounterReader: deps.encounterReader,
      selections,
      results,
      providerMatches: new EmptyProviderMatches(),
      eventPublisher: deps.eventPublisher,
      authorization: deps.authorization,
      ids,
      clock,
    }),
  };
}

export type ResultsModule = ReturnType<typeof createResultsModule>;
