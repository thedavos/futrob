import type {
  CompetitionTeamManagementDetailResponse,
  GetCompetitionRankingsResponse,
  RankingRowDto,
  RankingSnapshotDto,
} from "@futrob/api-contracts";
import { rankingNamesFromTeams, type RankingNames } from "./competition-rankings-view.ts";

const snapshot = (
  kind: RankingSnapshotDto["kind"],
  rows: readonly RankingRowDto[],
): RankingSnapshotDto => ({
  competitionId: "competition-1",
  organizationId: "org-1",
  kind,
  formulaVersion: "player-ranking-v1",
  eligibility: { minimumMatches: 3, minimumTeamMinutesRatio: 0.6 },
  rows: [...rows],
  sourceRevisionMax: 4,
  updatedAt: "2026-10-20T21:30:00.000Z",
});

/** Scorer ranking includes a player with no Team and one absent from every roster. */
export const rankingsFixture: GetCompetitionRankingsResponse = {
  rankings: [
    snapshot("scorer", [
      {
        position: 1,
        playerProfileId: "profile-lucia",
        teamId: "team-cuervos",
        value: 9,
        matchesPlayed: 5,
        minutes: 450,
      },
      {
        position: 2,
        playerProfileId: "profile-mateo",
        teamId: "team-halcones",
        value: 6,
        matchesPlayed: 5,
        minutes: 412,
      },
      {
        position: 3,
        playerProfileId: "profile-unknown",
        teamId: null,
        value: 4,
        matchesPlayed: 3,
        minutes: 270,
      },
    ]),
    snapshot("assister", [
      {
        position: 1,
        playerProfileId: "profile-mateo",
        teamId: "team-halcones",
        value: 7,
        matchesPlayed: 5,
        minutes: 412,
      },
      {
        position: 2,
        playerProfileId: "profile-lucia",
        teamId: "team-cuervos",
        value: 3,
        matchesPlayed: 5,
        minutes: 450,
      },
    ]),
    snapshot("rating", [
      {
        position: 1,
        playerProfileId: "profile-lucia",
        teamId: "team-cuervos",
        value: 8.25,
        matchesPlayed: 5,
        minutes: 450,
      },
      {
        position: 2,
        playerProfileId: "profile-mateo",
        teamId: "team-halcones",
        value: 7.4666,
        matchesPlayed: 5,
        minutes: 412,
      },
    ]),
    snapshot("mvp", []),
    snapshot("goalkeeper", [
      {
        position: 1,
        playerProfileId: "profile-sofia",
        teamId: "team-cuervos",
        value: 21,
        matchesPlayed: 5,
        minutes: 450,
      },
    ]),
  ],
};

type FixtureMember = { readonly id: string; readonly name: string };

const MEMBERS = new Map<string, readonly FixtureMember[]>([
  [
    "team-cuervos",
    [
      { id: "profile-lucia", name: "Lucía Pérez" },
      { id: "profile-sofia", name: "Sofía Ramírez" },
    ],
  ],
  ["team-halcones", [{ id: "profile-mateo", name: "Mateo Fernández de la Torre" }]],
]);

const TEAM_NAMES = new Map<string, string>([
  ["team-cuervos", "Cuervos FC"],
  ["team-halcones", "Club Atlético Halcones del Pacífico"],
]);

export function teamDetailFixture(teamId: string): CompetitionTeamManagementDetailResponse {
  const createdAt = "2026-09-01T12:00:00.000Z";
  return {
    team: {
      id: teamId,
      organizationId: "org-1",
      name: TEAM_NAMES.get(teamId) ?? teamId,
      createdAt,
    },
    entry: {
      id: `entry-${teamId}`,
      organizationId: "org-1",
      competitionId: "competition-1",
      teamId,
      status: "approved",
      createdAt,
    },
    roster: {
      state: "closed",
      memberCount: MEMBERS.get(teamId)?.length ?? 0,
      maxSize: 20,
      lockedAt: null,
    },
    externalClub: null,
    members: (MEMBERS.get(teamId) ?? []).map((member) => ({
      membership: {
        id: `membership-${member.id}`,
        organizationId: "org-1",
        competitionId: "competition-1",
        teamId,
        playerProfileId: member.id,
        gameAccountId: null,
        role: "player",
        createdAt,
      },
      presentation: { displayName: member.name, avatarUrl: null, gameAccount: null },
    })),
  };
}

export const rankingNamesFixture: RankingNames = rankingNamesFromTeams(
  [...TEAM_NAMES.keys()].map((teamId) => teamDetailFixture(teamId)),
);

/** Only Cuervos' roster resolved: Halcones refused its roster read. */
export const rankingNamesCuervosOnlyFixture: RankingNames = rankingNamesFromTeams([
  teamDetailFixture("team-cuervos"),
]);
