import { err, ok, type ClockPort, type OrganizationId, type Result } from "@futrob/shared-kernel";
import {
  CandidateDataUnavailable,
  type ListEncounterCandidatesError,
} from "../../domain/errors/encounter-candidates.errors.ts";
import { EncounterNotFound } from "../../domain/errors/select-official-matches.errors.ts";
import type { EncounterCandidateAssociation } from "../../domain/entities/encounter-candidate-association.ts";
import type { EncounterCandidateAssociationRepository } from "../../domain/ports/encounter-candidate-association.repository.ts";
import type {
  EncounterReaderPort,
  EncounterScheduleSnapshot,
} from "../../domain/ports/encounter-reader.port.ts";
import type { ProviderMatchReaderPort } from "../../domain/ports/provider-match-reader.port.ts";
import {
  candidateWindowFor,
  type CandidateWindow,
} from "../../domain/policies/candidate-window.ts";
import { reconcileCandidateAssociations } from "../../domain/policies/reconcile-candidate-associations.ts";

export interface AssociateEncounterCandidatesInput {
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterScheduleSnapshot["encounterId"];
}

export type AssociateEncounterCandidatesOutput =
  | {
      readonly status: "associated";
      readonly window: CandidateWindow;
      readonly associations: readonly EncounterCandidateAssociation[];
    }
  | {
      readonly status: "clubs_not_connected";
      readonly sides: readonly ("home" | "away")[];
    }
  | {
      readonly status: "provider_mismatch";
    };

export type AssociateEncounterCandidatesError = ListEncounterCandidatesError;

export const CANDIDATE_SET_WRITE_ATTEMPTS = 8;

export interface PersistEncounterCandidateAssociationsDeps {
  readonly encounterReader: EncounterReaderPort;
  readonly providerMatches: ProviderMatchReaderPort;
  readonly associations: EncounterCandidateAssociationRepository;
  readonly clock: ClockPort;
}

export async function persistEncounterCandidateAssociations(
  deps: PersistEncounterCandidateAssociationsDeps,
  input: {
    readonly encounterId: EncounterScheduleSnapshot["encounterId"];
    readonly organizationId?: OrganizationId;
  },
): Promise<Result<AssociateEncounterCandidatesOutput, AssociateEncounterCandidatesError>> {
  try {
    for (let attempt = 0; attempt < CANDIDATE_SET_WRITE_ATTEMPTS; attempt++) {
      const encounter = await deps.encounterReader.getById(input.encounterId);
      if (
        !encounter ||
        (input.organizationId && encounter.organizationId !== input.organizationId)
      ) {
        return err(
          new EncounterNotFound({
            code: "results.encounter_not_found",
            message: "Encounter not found",
            encounterId: input.encounterId,
          }),
        );
      }

      const window = candidateWindowFor(encounter.scheduledStartAt);
      const read = await deps.providerMatches.listCandidatesForEncounter({
        encounterId: encounter.encounterId,
        homeTeamId: encounter.homeTeamId,
        awayTeamId: encounter.awayTeamId,
        window,
      });
      if (read.status !== "ready") return ok(read);

      const loaded = await deps.associations.loadForEncounter(
        encounter.organizationId,
        encounter.encounterId,
      );
      const replaced = await deps.associations.replaceForEncounter(
        encounter.organizationId,
        encounter.encounterId,
        reconcileCandidateAssociations({
          existing: loaded.associations,
          inWindowRefs: read.matches.map((match) => ({
            providerKey: match.provider.key,
            externalId: match.provider.externalMatchId,
          })),
          organizationId: encounter.organizationId,
          encounterId: encounter.encounterId,
          now: deps.clock.now(),
        }),
        loaded.generation,
      );
      switch (replaced.status) {
        case "replaced":
          return ok({
            status: "associated",
            window,
            associations: replaced.associations,
          });
        case "conflict":
          continue;
        default: {
          const _exhaustive: never = replaced;
          return _exhaustive;
        }
      }
    }
    return err(
      new CandidateDataUnavailable({
        code: "results.candidate_data_unavailable",
        message: "Candidate data is temporarily unavailable",
      }),
    );
  } catch {
    return err(
      new CandidateDataUnavailable({
        code: "results.candidate_data_unavailable",
        message: "Candidate data is temporarily unavailable",
      }),
    );
  }
}

export class AssociateEncounterCandidatesUseCase {
  constructor(private readonly deps: PersistEncounterCandidateAssociationsDeps) {}

  async execute(
    input: AssociateEncounterCandidatesInput,
  ): Promise<Result<AssociateEncounterCandidatesOutput, AssociateEncounterCandidatesError>> {
    return persistEncounterCandidateAssociations(this.deps, input);
  }
}
