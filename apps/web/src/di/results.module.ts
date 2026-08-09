import { SelectOfficialMatchesUseCase } from "@/modules/results";
import type { EncounterReaderPort } from "@/modules/results";
import type { EventPublisherPort } from "@/shared/application/event-publisher.ts";
import type { AuthorizationPort } from "@futrob/shared-kernel";

export interface ResultsModuleDependencies {
  readonly encounterReader: EncounterReaderPort;
  readonly eventPublisher: EventPublisherPort;
  readonly authorization: AuthorizationPort;
}

export function createResultsModule(deps: ResultsModuleDependencies) {
  return {
    selectOfficialMatches: new SelectOfficialMatchesUseCase({
      encounterReader: deps.encounterReader,
      eventPublisher: deps.eventPublisher,
      authorization: deps.authorization,
    }),
  };
}

export type ResultsModule = ReturnType<typeof createResultsModule>;
