import { err, ok, type ActorId, type ClockPort, type Result } from "@futrob/shared-kernel";
import type { ActiveTeamPreference } from "../../domain/entities/active-team-preference.ts";
import {
  ActiveTeamNotOwned,
  PlayerProfileNotFound,
  type SetActiveTeamError,
} from "../../domain/errors/team.errors.ts";
import type { ActiveTeamPreferenceRepository } from "../../domain/ports/active-team-preference.repository.ts";
import type { CompetitionRosterMembershipRepository } from "../../domain/ports/competition-roster-membership.repository.ts";
import type { PlayerProfileRepository } from "../../domain/ports/player-profile.repository.ts";

export interface SetActiveTeamInput {
  readonly actorId: ActorId;
  readonly rosterMembershipId: string;
}

export class SetActiveTeamUseCase {
  constructor(
    private readonly deps: {
      readonly profiles: PlayerProfileRepository;
      readonly rosters: CompetitionRosterMembershipRepository;
      readonly preferences: ActiveTeamPreferenceRepository;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: SetActiveTeamInput,
  ): Promise<Result<ActiveTeamPreference, SetActiveTeamError>> {
    const profile = await this.deps.profiles.findByActor(input.actorId);
    if (!profile) {
      return err(
        new PlayerProfileNotFound({
          code: "teams.player_profile_not_found",
          message: "Player profile not found",
        }),
      );
    }

    const membership = await this.deps.rosters.findById(input.rosterMembershipId);
    if (!membership || membership.playerProfileId !== profile.id) {
      return err(
        new ActiveTeamNotOwned({
          code: "teams.active_team_not_owned",
          message: "Roster membership does not belong to this actor",
        }),
      );
    }

    return ok(
      await this.deps.preferences.save({
        actorId: input.actorId,
        rosterMembershipId: membership.id,
        updatedAt: this.deps.clock.now(),
      }),
    );
  }
}
