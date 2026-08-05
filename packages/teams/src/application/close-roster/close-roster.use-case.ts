import {
  err,
  ok,
  type ClockPort,
  type CompetitionId,
  type EventPublisherPort,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type { CompetitionRosterState } from "../../domain/entities/competition-roster-state.ts";
import type { RosterLockedEvent } from "../../domain/events/team.events.ts";
import { TeamNotFound, type CloseRosterError } from "../../domain/errors/team.errors.ts";
import type { CompetitionRosterStateRepository } from "../../domain/ports/competition-roster-state.repository.ts";
import type { TeamRepository } from "../../domain/ports/team.repository.ts";

export interface CloseRosterInput {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
}

export class CloseRosterUseCase {
  constructor(
    private readonly deps: {
      readonly teams: TeamRepository;
      readonly rosterStates: CompetitionRosterStateRepository;
      readonly clock: ClockPort;
      readonly eventPublisher?: EventPublisherPort;
    },
  ) {}

  async execute(
    input: CloseRosterInput,
  ): Promise<Result<CompetitionRosterState, CloseRosterError>> {
    const team = await this.deps.teams.findById(input.organizationId, input.teamId);
    if (!team) {
      return err(
        new TeamNotFound({
          code: "teams.not_found",
          message: "Team not found",
        }),
      );
    }

    const lockedAt = this.deps.clock.now();
    const state: CompetitionRosterState = {
      organizationId: input.organizationId,
      competitionId: input.competitionId,
      teamId: input.teamId,
      lockedAt,
    };
    const saved = await this.deps.rosterStates.save(state);

    if (this.deps.eventPublisher) {
      const event: RosterLockedEvent = {
        eventName: "teams.roster-locked",
        occurredAt: lockedAt.toISOString(),
        payload: {
          organizationId: input.organizationId,
          competitionId: input.competitionId,
          teamId: input.teamId,
          lockedAt: lockedAt.toISOString(),
        },
      };
      await this.deps.eventPublisher.publish(event);
    }

    return ok(saved);
  }
}
