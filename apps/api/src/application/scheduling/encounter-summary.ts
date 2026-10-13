import type { Competition } from "@futrob/competitions";
import type {
  ExternalClub,
  GameDataProviderKey,
  GetExternalClubInput,
  ProviderError,
} from "@futrob/game-data";
import type {
  EncounterScheduleSnapshot,
  FixtureEncounter,
  FixturePlan,
  SeriesResolutionMode,
} from "@futrob/scheduling";
import type {
  CompetitionId,
  EncounterId,
  OrganizationId,
  Result,
  TeamId,
} from "@futrob/shared-kernel";
import type { ExternalClubConnection, Team } from "@futrob/teams";

export type EncounterSide = {
  readonly teamId: TeamId;
  readonly name: string;
  readonly externalClub: ExternalClub | null;
};

export type EncounterSummary = {
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
  /** Null when the Encounter is not in an active fixture plan. */
  readonly resolutionMode: SeriesResolutionMode | null;
  readonly scheduledStartAt: Date;
  readonly officialMatchCount: 1 | 2;
  readonly home: EncounterSide;
  readonly away: EncounterSide;
};

export type EncounterSummaryDependencies = {
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

/** Names both Teams and places the Encounter in its competition; null when a Team is gone. */
export async function summarizeEncounter(
  deps: EncounterSummaryDependencies,
  snapshot: EncounterScheduleSnapshot,
): Promise<EncounterSummary | null> {
  const draft = await deps.competitions.findById(snapshot.organizationId, snapshot.competitionId);
  const [homeTeam, awayTeam] = await Promise.all([
    deps.teams.findById(snapshot.organizationId, snapshot.homeTeamId),
    deps.teams.findById(snapshot.organizationId, snapshot.awayTeamId),
  ]);
  if (!homeTeam || !awayTeam) return null;

  const [home, away, plans] = await Promise.all([
    side(deps, homeTeam),
    side(deps, awayTeam),
    deps.fixturePlans.listActive(snapshot.organizationId, snapshot.competitionId),
  ]);
  const placement = placementIn(plans, snapshot.encounterId);

  return {
    encounterId: snapshot.encounterId,
    competition: {
      id: snapshot.competitionId,
      organizationId: snapshot.organizationId,
      name: draft?.competition.name ?? snapshot.competitionId,
      timeZone: draft?.competition.timeZone ?? "UTC",
    },
    round: placement ? placement.round : null,
    resolutionMode: placement?.encounter.series?.resolutionMode ?? null,
    scheduledStartAt: snapshot.scheduledStartAt,
    officialMatchCount: snapshot.officialMatchCount,
    home,
    away,
  };
}

async function side(deps: EncounterSummaryDependencies, team: Team): Promise<EncounterSide> {
  const connection = await deps.connections.findByTeam(team.id);
  return {
    teamId: team.id,
    name: team.name,
    externalClub: connection ? await clubFromConnection(deps, connection) : null,
  };
}

async function clubFromConnection(
  deps: EncounterSummaryDependencies,
  connection: ExternalClubConnection,
): Promise<ExternalClub> {
  const fallback: ExternalClub = {
    providerKey: connection.providerKey,
    externalClubId: connection.externalClubId,
    name: connection.externalClubName,
    platform: connection.platform,
    gameEdition: connection.gameEdition,
    imageUrl: null,
  };
  const resolved = await deps.getExternalClub(connection.providerKey, {
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

function placementIn(
  plans: readonly FixturePlan[],
  encounterId: EncounterId,
): {
  readonly round: { readonly number: number; readonly total: number | null };
  readonly encounter: FixtureEncounter;
} | null {
  for (const plan of plans) {
    const total = plan.stages.reduce((sum, stage) => sum + stage.rounds.length, 0);
    for (const stage of plan.stages) {
      for (const round of stage.rounds) {
        const encounter = round.encounters.find((candidate) => candidate.id === encounterId);
        if (encounter) {
          return { round: { number: round.number, total: total > 0 ? total : null }, encounter };
        }
      }
    }
  }
  return null;
}
