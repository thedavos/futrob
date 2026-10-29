import {
  err,
  ok,
  type ClockPort,
  type EncounterId,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import { CandidateDataUnavailable } from "../../domain/errors/encounter-candidates.errors.ts";
import type { EncounterCandidateAssociationRepository } from "../../domain/ports/encounter-candidate-association.repository.ts";
import { reconcileCandidateAssociations } from "../../domain/policies/reconcile-candidate-associations.ts";
import { CANDIDATE_SET_WRITE_ATTEMPTS } from "../associate-encounter-candidates/associate-encounter-candidates.use-case.ts";

export interface InvalidateEncounterCandidatesInput {
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
}

/**
 * Withdraws the eligibility of every candidate of an Encounter whose Teams changed or that
 * left the schedule. Rows stay as evidence; a later association re-evaluates the new pairing.
 */
export class InvalidateEncounterCandidatesUseCase {
  constructor(
    private readonly deps: {
      readonly associations: EncounterCandidateAssociationRepository;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: InvalidateEncounterCandidatesInput,
  ): Promise<Result<void, CandidateDataUnavailable>> {
    for (let attempt = 0; attempt < CANDIDATE_SET_WRITE_ATTEMPTS; attempt++) {
      const loaded = await this.deps.associations.loadForEncounter(
        input.organizationId,
        input.encounterId,
      );
      if (!loaded.associations.some((association) => association.eligible)) return ok(undefined);
      const replaced = await this.deps.associations.replaceForEncounter(
        input.organizationId,
        input.encounterId,
        reconcileCandidateAssociations({
          existing: loaded.associations,
          inWindowRefs: [],
          organizationId: input.organizationId,
          encounterId: input.encounterId,
          now: this.deps.clock.now(),
        }),
        loaded.generation,
      );
      if (replaced.status === "replaced") return ok(undefined);
    }
    return err(
      new CandidateDataUnavailable({
        code: "results.candidate_data_unavailable",
        message: "Candidate data is temporarily unavailable",
      }),
    );
  }
}
