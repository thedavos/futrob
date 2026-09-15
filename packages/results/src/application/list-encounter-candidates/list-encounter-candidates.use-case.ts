import type { ExternalReference, ProviderMatch } from "@futrob/game-data";
import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type EncounterId,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import {
  CandidateDataUnavailable,
  type ListEncounterCandidatesError,
} from "../../domain/errors/encounter-candidates.errors.ts";
import {
  EncounterNotFound,
  OfficialSelectionForbidden,
} from "../../domain/errors/select-official-matches.errors.ts";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type { ProviderMatchReaderPort } from "../../domain/ports/provider-match-reader.port.ts";
import {
  candidateWindowFor,
  type CandidateWindow,
} from "../../domain/policies/candidate-window.ts";
import { RESULT_PERMISSION } from "../../domain/policies/result-permissions.ts";

export interface ListEncounterCandidatesInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
}

export interface EncounterCandidateSummary {
  readonly reference: ExternalReference;
  readonly occurredAt: Date;
  readonly home: EncounterCandidateTeam;
  readonly away: EncounterCandidateTeam;
  readonly game: {
    readonly edition: string;
    readonly platform: string;
    readonly mode: string;
  };
  readonly metadata: {
    readonly durationSeconds: number | null;
    readonly wasDisconnected: boolean;
    readonly winnerByForfeit: boolean;
    readonly completeness: "complete" | "partial" | "unknown";
  };
  readonly playerObservationCount: number;
}

export interface EncounterCandidateTeam {
  readonly externalClubId: string;
  readonly name: string;
  readonly goals: number;
  readonly imageUrl: string | null;
}

export type ListEncounterCandidatesOutput =
  | {
      readonly status: "ready";
      readonly window: CandidateWindow;
      readonly candidates: readonly EncounterCandidateSummary[];
    }
  | {
      readonly status: "clubs_not_connected";
      readonly sides: readonly ("home" | "away")[];
    }
  | {
      readonly status: "provider_mismatch";
    };

export class ListEncounterCandidatesUseCase {
  constructor(
    private readonly deps: {
      readonly encounterReader: EncounterReaderPort;
      readonly providerMatches: ProviderMatchReaderPort;
      readonly authorization: AuthorizationPort;
    },
  ) {}

  async execute(
    input: ListEncounterCandidatesInput,
  ): Promise<Result<ListEncounterCandidatesOutput, ListEncounterCandidatesError>> {
    const encounter = await this.deps.encounterReader.getById(input.encounterId);
    if (!encounter || encounter.organizationId !== input.organizationId) {
      return err(
        new EncounterNotFound({
          code: "results.encounter_not_found",
          message: "Encounter not found",
          encounterId: input.encounterId,
        }),
      );
    }

    const authorization = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: {
        organizationId: encounter.organizationId,
        competitionId: encounter.competitionId,
        encounterId: encounter.encounterId,
      },
    });
    if (!authorization.allowed) {
      return err(
        new OfficialSelectionForbidden({
          code: "results.official_selection_forbidden",
          message: "The actor cannot propose an official selection for this encounter",
        }),
      );
    }

    const window = candidateWindowFor(encounter.scheduledStartAt);
    try {
      const read = await this.deps.providerMatches.listCandidatesForEncounter({
        encounterId: encounter.encounterId,
        homeTeamId: encounter.homeTeamId,
        awayTeamId: encounter.awayTeamId,
        window,
      });
      if (read.status !== "ready") return ok(read);

      return ok({
        status: "ready",
        window,
        candidates: read.matches.map(toCandidateSummary),
      });
    } catch {
      return err(
        new CandidateDataUnavailable({
          code: "results.candidate_data_unavailable",
          message: "Candidate data is temporarily unavailable",
        }),
      );
    }
  }
}

function toCandidateSummary(match: ProviderMatch): EncounterCandidateSummary {
  return {
    reference: {
      providerKey: match.provider.key,
      externalId: match.provider.externalMatchId,
    },
    occurredAt: match.occurredAt,
    home: {
      externalClubId: match.home.externalClubId,
      name: match.home.name,
      goals: match.home.goals,
      imageUrl: match.home.imageUrl,
    },
    away: {
      externalClubId: match.away.externalClubId,
      name: match.away.name,
      goals: match.away.goals,
      imageUrl: match.away.imageUrl,
    },
    game: {
      edition: match.game.edition,
      platform: match.game.platform,
      mode: match.game.mode,
    },
    metadata: {
      durationSeconds: match.metadata.durationSeconds,
      wasDisconnected: match.metadata.wasDisconnected,
      winnerByForfeit: match.metadata.winnerByForfeit,
      completeness: match.metadata.completeness,
    },
    playerObservationCount: match.players.length,
  };
}
