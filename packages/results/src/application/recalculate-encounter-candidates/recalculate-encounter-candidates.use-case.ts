import { err, type ClockPort, type EncounterId, type Result } from "@futrob/shared-kernel";
import { EncounterNotFound } from "../../domain/errors/select-official-matches.errors.ts";
import type { EncounterCandidateAssociationRepository } from "../../domain/ports/encounter-candidate-association.repository.ts";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type { ProviderMatchReaderPort } from "../../domain/ports/provider-match-reader.port.ts";
import {
  persistEncounterCandidateAssociations,
  type AssociateEncounterCandidatesError,
  type AssociateEncounterCandidatesOutput,
} from "../associate-encounter-candidates/associate-encounter-candidates.use-case.ts";

export interface RecalculateEncounterCandidatesInput {
  readonly encounterId: EncounterId;
}

export class RecalculateEncounterCandidatesUseCase {
  constructor(
    private readonly deps: {
      readonly encounterReader: EncounterReaderPort;
      readonly providerMatches: ProviderMatchReaderPort;
      readonly associations: EncounterCandidateAssociationRepository;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: RecalculateEncounterCandidatesInput,
  ): Promise<Result<AssociateEncounterCandidatesOutput, AssociateEncounterCandidatesError>> {
    const encounter = await this.deps.encounterReader.getById(input.encounterId);
    if (!encounter) {
      return err(
        new EncounterNotFound({
          code: "results.encounter_not_found",
          message: "Encounter not found",
          encounterId: input.encounterId,
        }),
      );
    }
    return persistEncounterCandidateAssociations(this.deps, encounter);
  }
}
