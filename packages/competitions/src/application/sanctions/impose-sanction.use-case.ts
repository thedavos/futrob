import {
  err,
  ok,
  type AuthorizationPort,
  type ClockPort,
  type IdGeneratorPort,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type { CompetitionSanction } from "../../domain/entities/competition-sanction.ts";
import {
  SanctionTargetNotFound,
  type ImposeSanctionError,
} from "../../domain/errors/sanction.errors.ts";
import {
  parseSanctionTerms,
  type SanctionTermsInput,
} from "../../domain/policies/sanction-terms.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";
import type { CompetitionSanctionRepository } from "../../domain/ports/competition-sanction.repository.ts";
import type { CompetitionRepository } from "../../domain/ports/competition.repository.ts";
import type { SanctionTargetReaderPort } from "../../domain/ports/sanction-target.reader.ts";
import {
  requireSanctionableCompetition,
  type SanctionScope,
} from "./sanctionable-competition.guard.ts";

export interface ImposeSanctionInput extends SanctionScope, SanctionTermsInput {
  /** Correlation of the request, stored with the sanction for the audit trail. */
  readonly requestId: string;
}

function targetNotFound(target: SanctionTargetNotFound["target"], message: string) {
  return new SanctionTargetNotFound({
    code: "competitions.sanction_target_not_found",
    message,
    target,
  });
}

/** The organizer sanctions a Team entered in the competition, or one of its players. */
export class ImposeSanctionUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly competitions: Pick<CompetitionRepository, "findById">;
      readonly entries: Pick<CompetitionEntryRepository, "findByCompetitionAndTeam">;
      readonly targets: SanctionTargetReaderPort;
      readonly sanctions: CompetitionSanctionRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(
    input: ImposeSanctionInput,
  ): Promise<Result<CompetitionSanction, ImposeSanctionError>> {
    const competition = await requireSanctionableCompetition(this.deps, input);
    if (competition.isErr()) return err(competition.error);
    const terms = parseSanctionTerms(input);
    if (terms.isErr()) return err(terms.error);

    const teamId = await this.resolveTeam(input);
    if (teamId.isErr()) return err(teamId.error);
    if (
      terms.value.encounterId !== null &&
      !(await this.deps.targets.isEncounterOfTeam(
        input.organizationId,
        input.competitionId,
        terms.value.encounterId,
        teamId.value,
      ))
    ) {
      return err(targetNotFound("encounter", "The Team does not play that encounter"));
    }

    const { target } = terms.value;
    return ok(
      await this.deps.sanctions.create({
        id: this.deps.ids.generate(),
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        targetType: target.type,
        teamId: teamId.value,
        playerProfileId: target.type === "player" ? target.playerProfileId : null,
        type: terms.value.type,
        pointsDeducted: terms.value.pointsDeducted,
        suspensionMatches: terms.value.suspensionMatches,
        encounterId: terms.value.encounterId,
        reason: terms.value.reason,
        imposedByActorId: input.actorId,
        imposedAt: this.deps.clock.now(),
        requestId: input.requestId,
        revocation: null,
      }),
    );
  }

  /** The sanctioned Team, or the player's Team; either must have an approved entry. */
  private async resolveTeam(
    input: ImposeSanctionInput,
  ): Promise<Result<TeamId, SanctionTargetNotFound>> {
    const { target } = input;
    const teamId =
      target.type === "team"
        ? target.teamId
        : await this.deps.targets.findPlayerTeam(
            input.organizationId,
            input.competitionId,
            target.playerProfileId,
          );
    if (teamId === null) {
      return err(targetNotFound("player", "The player has no roster in this competition"));
    }
    const entry = await this.deps.entries.findByCompetitionAndTeam(
      input.organizationId,
      input.competitionId,
      teamId,
    );
    if (entry?.status !== "approved") {
      return err(targetNotFound(target.type, "The Team has no approved entry in this competition"));
    }
    return ok(teamId);
  }
}
