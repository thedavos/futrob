import { err, ok, type AuthorizationPort, type ClockPort, type Result } from "@futrob/shared-kernel";
import type { CompetitionSanction } from "../../domain/entities/competition-sanction.ts";
import {
  SanctionAlreadyRevoked,
  SanctionNotFound,
  type RevokeSanctionError,
} from "../../domain/errors/sanction.errors.ts";
import { parseSanctionReason } from "../../domain/policies/sanction-terms.ts";
import type { CompetitionSanctionRepository } from "../../domain/ports/competition-sanction.repository.ts";
import type { CompetitionRepository } from "../../domain/ports/competition.repository.ts";
import { requireSanctionableCompetition, type SanctionScope } from "./sanctionable-competition.guard.ts";

export interface RevokeSanctionInput extends SanctionScope {
  readonly sanctionId: string;
  readonly reason: string;
  readonly requestId: string;
}

const alreadyRevoked = () =>
  new SanctionAlreadyRevoked({
    code: "competitions.sanction_already_revoked",
    message: "The sanction was already revoked",
  });

/** Withdraws an active sanction. The row stays, with who revoked it and why. */
export class RevokeSanctionUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly competitions: Pick<CompetitionRepository, "findById">;
      readonly sanctions: CompetitionSanctionRepository;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: RevokeSanctionInput,
  ): Promise<Result<CompetitionSanction, RevokeSanctionError>> {
    const competition = await requireSanctionableCompetition(this.deps, input);
    if (competition.isErr()) return err(competition.error);
    const reason = parseSanctionReason(input.reason);
    if (reason.isErr()) return err(reason.error);

    const current = await this.deps.sanctions.findById(
      input.organizationId,
      input.competitionId,
      input.sanctionId,
    );
    if (!current) {
      return err(
        new SanctionNotFound({
          code: "competitions.sanction_not_found",
          message: "Sanction not found",
        }),
      );
    }
    if (current.revocation !== null) return err(alreadyRevoked());

    const revoked = await this.deps.sanctions.revoke(
      input.organizationId,
      input.competitionId,
      input.sanctionId,
      {
        actorId: input.actorId,
        at: this.deps.clock.now(),
        reason: reason.value,
        requestId: input.requestId,
      },
    );
    return revoked ? ok(revoked) : err(alreadyRevoked());
  }
}
