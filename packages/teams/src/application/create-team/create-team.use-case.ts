import {
  asTeamId,
  err,
  ok,
  type ActorId,
  type ClockPort,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import type { Team } from "../../domain/entities/team.ts";
import {
  CreationKeyConflict,
  InvalidTeamName,
  type CreateTeamError,
} from "../../domain/errors/team.errors.ts";
import type { TeamRepository } from "../../domain/ports/team.repository.ts";

export interface CreateTeamInput {
  readonly organizationId: OrganizationId;
  readonly actorId: ActorId;
  readonly name: string;
  readonly creationKey?: string;
}

export class CreateTeamUseCase {
  constructor(
    private readonly deps: {
      readonly teams: TeamRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(input: CreateTeamInput): Promise<Result<Team, CreateTeamError>> {
    const name = input.name.trim();
    if (name.length === 0 || name.length > 120) {
      return err(
        new InvalidTeamName({
          code: "teams.invalid_name",
          message: "Invalid team name",
        }),
      );
    }

    if (input.creationKey) {
      const existing = await this.deps.teams.findByCreationKey(input.creationKey);
      if (existing) {
        if (existing.organizationId !== input.organizationId) {
          return err(
            new CreationKeyConflict({
              code: "teams.creation_key_conflict",
              message: "Creation key belongs to another organization",
            }),
          );
        }
        return ok(existing);
      }
    }

    const team: Team = {
      id: asTeamId(this.deps.ids.generate()),
      organizationId: input.organizationId,
      name,
      createdAt: this.deps.clock.now(),
      createdByActorId: input.actorId,
      creationKey: input.creationKey ?? null,
    };
    return ok(await this.deps.teams.save(team));
  }
}
