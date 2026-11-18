import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type CompetitionId,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import type { CompetitionExploreListing } from "../../domain/entities/competition.ts";
import {
  CompetitionNotEditable,
  CompetitionNotFound,
  type UpdateCompetitionExploreListingError,
} from "../../domain/errors/competition.errors.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";
import { COMPETITION_PERMISSION } from "../../domain/policies/competition-permissions.ts";
import { competitionPermissionError } from "../require-competition-permission.ts";

export interface UpdateCompetitionExploreListingInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly exploreListing: CompetitionExploreListing;
}

/** Lists or unlists a competition in Explore in any status except archived. */
export class UpdateCompetitionExploreListingUseCase {
  constructor(
    private readonly deps: {
      readonly competitions: CompetitionRepository;
      readonly clock: ClockPort;
      readonly authorization: AuthorizationPort;
    },
  ) {}

  async execute(
    input: UpdateCompetitionExploreListingInput,
  ): Promise<Result<CompetitionDraft, UpdateCompetitionExploreListingError>> {
    const forbidden = await competitionPermissionError({
      authorization: this.deps.authorization,
      actorId: input.actorId,
      permission: COMPETITION_PERMISSION.update,
      scope: { organizationId: input.organizationId, competitionId: input.competitionId },
    });
    if (forbidden) return err(forbidden);
    const current = await this.deps.competitions.findById(
      input.organizationId,
      input.competitionId,
    );
    if (!current)
      return err(
        new CompetitionNotFound({
          code: "competitions.not_found",
          message: "Competition not found",
        }),
      );
    if (current.competition.status === "archived")
      return err(
        new CompetitionNotEditable({
          code: "competitions.not_editable",
          message: "Archived competitions are read-only",
        }),
      );
    if (current.competition.exploreListing === input.exploreListing) return ok(current);
    return ok(
      await this.deps.competitions.saveExploreListing({
        ...current,
        competition: {
          ...current.competition,
          exploreListing: input.exploreListing,
          updatedAt: this.deps.clock.now(),
        },
      }),
    );
  }
}
