import type { EncounterScheduleSnapshot } from "@futrob/scheduling";
import type { ActorId, ClockPort, TeamId } from "@futrob/shared-kernel";
import type { CompetitionRosterMembership, PlayerProfile } from "@futrob/teams";
import {
  summarizeEncounter,
  type EncounterSide,
  type EncounterSummary,
  type EncounterSummaryDependencies,
} from "./encounter-summary.ts";

export type NextEncounterSide = EncounterSide;

export type MyNextEncounter = Omit<EncounterSummary, "resolutionMode">;

export type GetMyNextEncounterDependencies = EncounterSummaryDependencies & {
  readonly clock: ClockPort;
  readonly profiles: {
    findByActor(actorId: ActorId): Promise<PlayerProfile | null>;
  };
  readonly rosters: {
    listByPlayerProfile(playerProfileId: string): Promise<readonly CompetitionRosterMembership[]>;
  };
  readonly encounters: {
    findNextUpcomingByTeamIds(
      teamIds: readonly TeamId[],
      now: Date,
    ): Promise<EncounterScheduleSnapshot | null>;
  };
};

export class GetMyNextEncounterUseCase {
  constructor(private readonly deps: GetMyNextEncounterDependencies) {}

  async execute(input: { readonly actorId: ActorId }): Promise<MyNextEncounter | null> {
    const profile = await this.deps.profiles.findByActor(input.actorId);
    if (!profile) return null;

    const memberships = await this.deps.rosters.listByPlayerProfile(profile.id);
    const teamIds = uniqueTeamIds(memberships);
    if (teamIds.length === 0) return null;

    const snapshot = await this.deps.encounters.findNextUpcomingByTeamIds(
      teamIds,
      this.deps.clock.now(),
    );
    if (!snapshot) return null;

    const summary = await summarizeEncounter(this.deps, snapshot);
    if (!summary) return null;
    const { resolutionMode: _resolutionMode, ...encounter } = summary;
    return encounter;
  }
}

function uniqueTeamIds(memberships: readonly CompetitionRosterMembership[]): TeamId[] {
  return [...new Set(memberships.map((membership) => membership.teamId))];
}
