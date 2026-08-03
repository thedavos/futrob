import { err, ok, type Result } from "@futrob/shared-kernel";
import type { ActorId, ClockPort, CompetitionId, OrganizationId } from "@futrob/shared-kernel";
import type {
  CompetitionMembership,
  CompetitionMembershipRole,
} from "../../domain/entities/competition-membership.ts";
import {
  CompetitionNotFound,
  type JoinCompetitionError,
} from "../../domain/errors/competition.errors.ts";
import type { CompetitionMembershipRepository } from "../../domain/ports/competition-membership.repository.ts";
import type { CompetitionRepository } from "../../domain/ports/competition.repository.ts";

export interface JoinCompetitionInput {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly actorId: ActorId;
  readonly role: CompetitionMembershipRole;
}

export class JoinCompetitionUseCase {
  constructor(
    private readonly deps: {
      readonly competitions: CompetitionRepository;
      readonly memberships: CompetitionMembershipRepository;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: JoinCompetitionInput,
  ): Promise<Result<CompetitionMembership, JoinCompetitionError>> {
    const competition = await this.deps.competitions.findById(
      input.organizationId,
      input.competitionId,
    );
    if (!competition) {
      return err(
        new CompetitionNotFound({
          code: "competitions.not_found",
          message: "Competition not found",
        }),
      );
    }
    const existing = await this.deps.memberships.findByCompetitionAndActor(
      input.competitionId,
      input.actorId,
    );
    if (existing) return ok(existing);
    return ok(
      await this.deps.memberships.add({
        ...input,
        createdAt: this.deps.clock.now(),
      }),
    );
  }
}
