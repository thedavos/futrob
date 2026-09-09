import type { Competition } from "@futrob/competitions";
import type {
  ExternalClub,
  GameDataProviderKey,
  GetExternalClubInput,
  ProviderError,
} from "@futrob/game-data";
import type { EncounterScheduleSnapshot, FixturePlan } from "@futrob/scheduling";
import {
  type ActorId,
  type ClockPort,
  type CompetitionId,
  type EncounterId,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type {
  CompetitionRosterMembership,
  ExternalClubConnection,
  PlayerProfile,
  Team,
} from "@futrob/teams";

export type NextEncounterSide = {
  readonly teamId: TeamId;
  readonly name: string;
  readonly externalClub: ExternalClub | null;
};

export type MyNextEncounter = {
  readonly encounterId: EncounterId;
  readonly competition: {
    readonly id: CompetitionId;
    readonly organizationId: OrganizationId;
    readonly name: string;
    readonly timeZone: string;
  };
  readonly round: {
    readonly number: number;
    readonly total: number | null;
  } | null;
  readonly scheduledStartAt: Date;
  readonly officialMatchCount: 1 | 2;
  readonly home: NextEncounterSide;
  readonly away: NextEncounterSide;
};

export type GetMyNextEncounterDependencies = {
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
  readonly competitions: {
    findById(
      organizationId: OrganizationId,
      competitionId: CompetitionId,
    ): Promise<{ readonly competition: Competition } | null>;
  };
  readonly teams: {
    findById(organizationId: OrganizationId, teamId: TeamId): Promise<Team | null>;
  };
  readonly connections: {
    findByTeam(teamId: TeamId): Promise<ExternalClubConnection | null>;
  };
  readonly getExternalClub: (
    providerKey: GameDataProviderKey,
    input: GetExternalClubInput,
  ) => Promise<Result<ExternalClub, ProviderError>>;
  readonly fixturePlans: {
    listActive(
      organizationId: OrganizationId,
      competitionId: CompetitionId,
    ): Promise<FixturePlan[]>;
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

    const draft = await this.deps.competitions.findById(
      snapshot.organizationId,
      snapshot.competitionId,
    );
    const [homeTeam, awayTeam] = await Promise.all([
      this.deps.teams.findById(snapshot.organizationId, snapshot.homeTeamId),
      this.deps.teams.findById(snapshot.organizationId, snapshot.awayTeamId),
    ]);
    if (!homeTeam || !awayTeam) return null;

    const [home, away, plans] = await Promise.all([
      this.side(homeTeam),
      this.side(awayTeam),
      this.deps.fixturePlans.listActive(snapshot.organizationId, snapshot.competitionId),
    ]);

    return {
      encounterId: snapshot.encounterId,
      competition: {
        id: snapshot.competitionId,
        organizationId: snapshot.organizationId,
        name: draft?.competition.name ?? snapshot.competitionId,
        timeZone: draft?.competition.timeZone ?? "UTC",
      },
      round: roundFromPlans(plans, snapshot.encounterId),
      scheduledStartAt: snapshot.scheduledStartAt,
      officialMatchCount: snapshot.officialMatchCount,
      home,
      away,
    };
  }

  private async side(team: Team): Promise<NextEncounterSide> {
    const connection = await this.deps.connections.findByTeam(team.id);
    return {
      teamId: team.id,
      name: team.name,
      externalClub: connection ? await this.clubFromConnection(connection) : null,
    };
  }

  private async clubFromConnection(connection: ExternalClubConnection): Promise<ExternalClub> {
    const fallback: ExternalClub = {
      providerKey: connection.providerKey,
      externalClubId: connection.externalClubId,
      name: connection.externalClubName,
      platform: connection.platform,
      gameEdition: connection.gameEdition,
      imageUrl: null,
    };
    const resolved = await this.deps.getExternalClub(connection.providerKey, {
      externalClubId: connection.externalClubId,
      platform: connection.platform,
      gameEdition: connection.gameEdition,
    });
    if (!resolved.isOk()) return fallback;
    return {
      ...resolved.value,
      name: resolved.value.name || fallback.name,
      imageUrl: resolved.value.imageUrl,
    };
  }
}

function uniqueTeamIds(memberships: readonly CompetitionRosterMembership[]): TeamId[] {
  return [...new Set(memberships.map((membership) => membership.teamId))];
}

type EncounterRound = {
  readonly number: number;
  readonly total: number | null;
};

function roundFromPlans(
  plans: readonly FixturePlan[],
  encounterId: EncounterId,
): EncounterRound | null {
  for (const plan of plans) {
    const total = plan.stages.reduce((sum, stage) => sum + stage.rounds.length, 0);
    for (const stage of plan.stages) {
      for (const round of stage.rounds) {
        if (round.encounters.some((encounter) => encounter.id === encounterId)) {
          return { number: round.number, total: total > 0 ? total : null };
        }
      }
    }
  }
  return null;
}
