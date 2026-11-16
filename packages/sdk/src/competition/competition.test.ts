import type {
  CompetitionDraftDto,
  CompetitionStandingSnapshotDto,
  CompetitionTeamManagementDetailResponse,
  FixturePlanDto,
  GetCurrentCompetitionFixtureResponse,
  RankingSnapshotDto,
} from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import {
  bracketStages,
  competitionFixtureView,
  playoffCut,
  rankingNamesFromTeams,
  rankingPlayerName,
  rankingTeamIds,
  rulesStages,
  selectRankingSnapshot,
  showsResolution,
  standingsTableRows,
  swissStandingsProgress,
  tiebreakCriteria,
} from "./index.ts";

const at = "2026-10-01T18:00:00.000Z";

function plan(stages: FixturePlanDto["stages"], format: FixturePlanDto["format"]): FixturePlanDto {
  return {
    id: "plan-1",
    revision: 1,
    status: "active",
    generationKey: "gen-1",
    organizationId: "org-1",
    competitionId: "comp-1",
    rulesVersion: 1,
    generationVersion: 1,
    format,
    timeZone: "Europe/Madrid",
    homeAndAway: false,
    seed: ["t1", "t2", "t3", "t4"],
    stages,
  };
}

const team = (teamId: string) => ({ kind: "team" as const, teamId });

const leaguePlayoffs: GetCurrentCompetitionFixtureResponse = {
  fixture: plan(
    [
      {
        id: "playoffs",
        kind: "playoffs",
        order: 2,
        rounds: [
          {
            id: "final",
            stageId: "playoffs",
            number: 2,
            scheduledStartAt: at,
            encounters: [
              {
                id: "e-final",
                stageId: "playoffs",
                roundId: "final",
                order: 1,
                home: { kind: "winner", encounterId: "e-semi-1" },
                away: { kind: "winner", encounterId: "e-missing" },
                scheduledStartAt: at,
                officialMatchCount: 1,
                series: null,
              },
            ],
          },
          {
            id: "semis",
            stageId: "playoffs",
            number: 1,
            scheduledStartAt: at,
            encounters: [
              {
                id: "e-semi-2",
                stageId: "playoffs",
                roundId: "semis",
                order: 2,
                home: { kind: "stage-rank", stageId: "league", rank: 2 },
                away: { kind: "stage-rank", stageId: "league", rank: 3 },
                scheduledStartAt: at,
                officialMatchCount: 2,
                series: null,
              },
              {
                id: "e-semi-1",
                stageId: "playoffs",
                roundId: "semis",
                order: 1,
                home: { kind: "stage-rank", stageId: "league", rank: 1 },
                away: { kind: "stage-rank", stageId: "league", rank: 4 },
                scheduledStartAt: at,
                officialMatchCount: 2,
                series: null,
              },
            ],
          },
        ],
      },
      {
        id: "league",
        kind: "league",
        order: 1,
        rounds: [
          {
            id: "md-1",
            stageId: "league",
            number: 1,
            scheduledStartAt: at,
            encounters: [
              {
                id: "e-1",
                stageId: "league",
                roundId: "md-1",
                order: 1,
                home: team("t1"),
                away: team("t-gone"),
                scheduledStartAt: at,
                officialMatchCount: 1,
                series: null,
                closedWithoutResult: true,
              },
              {
                id: "e-2",
                stageId: "league",
                roundId: "md-1",
                order: 2,
                groupId: "group-2",
                home: team("t2"),
                away: { kind: "bye" },
                scheduledStartAt: at,
                officialMatchCount: 1,
                series: null,
              },
            ],
          },
        ],
      },
    ],
    "league-playoffs",
  ),
  teams: [
    { teamId: "t1", name: "Rayo" },
    { teamId: "t2", name: "Norte" },
  ],
};

describe("competitionFixtureView", () => {
  it("is null until a fixture exists", () => {
    expect(competitionFixtureView({ fixture: null, teams: [] })).toBeNull();
  });

  it("orders stages, rounds and encounters and names rounds by stage kind", () => {
    const view = competitionFixtureView(leaguePlayoffs)!;
    expect(view.timeZone).toBe("Europe/Madrid");
    expect(view.stages.map((stage) => stage.kind)).toEqual(["league", "playoffs"]);
    expect(view.stages[0]!.rounds[0]!.name).toEqual({ kind: "matchday", number: 1 });
    expect(view.stages[1]!.rounds.map((round) => round.name.kind)).toEqual(["semifinal", "final"]);
    expect(view.stages[1]!.rounds[0]!.encounters.map((encounter) => encounter.id)).toEqual([
      "e-semi-1",
      "e-semi-2",
    ]);
  });

  it("resolves sides without showing ids and tells byes and closed encounters apart", () => {
    const view = competitionFixtureView(leaguePlayoffs)!;
    const [closed, bye] = view.stages[0]!.rounds[0]!.encounters;
    expect(closed!.kind).toBe("closed");
    expect(closed!.home).toEqual({ kind: "team", teamId: "t1", name: "Rayo", withdrawn: false });
    expect(closed!.away).toMatchObject({ kind: "team", name: null });
    expect(bye!.kind).toBe("bye");
    expect(bye!.group).toBe("B");

    const final = view.stages[1]!.rounds[1]!.encounters[0]!;
    expect(final.home).toEqual({
      kind: "winner",
      from: { round: { kind: "semifinal" }, order: 1 },
    });
    expect(final.away).toEqual({ kind: "winner", from: null });
    expect(view.stages[1]!.rounds[0]!.encounters[0]!.home).toEqual({
      kind: "stageRank",
      stage: "league",
      rank: 1,
    });
  });
});

describe("bracketStages", () => {
  it("keeps only knockout and playoff stages", () => {
    const view = competitionFixtureView(leaguePlayoffs)!;
    expect(bracketStages(view).map((stage) => stage.id)).toEqual(["playoffs"]);
  });

  it("is empty for a format without eliminations", () => {
    const league = competitionFixtureView({
      ...leaguePlayoffs,
      fixture: { ...leaguePlayoffs.fixture!, stages: [leaguePlayoffs.fixture!.stages[1]!] },
    })!;
    expect(bracketStages(league)).toEqual([]);
  });
});

function standings(
  overrides: Partial<CompetitionStandingSnapshotDto> = {},
): CompetitionStandingSnapshotDto {
  const row = (position: number, teamId: string) => ({
    position,
    teamId,
    played: 2,
    wins: 1,
    draws: 0,
    losses: 1,
    goalsFor: 3,
    goalsAgainst: 3,
    goalDifference: 0,
    points: 3,
    form: [],
  });
  return {
    competitionId: "comp-1",
    organizationId: "org-1",
    formulaVersion: "points-gd-gf-v1",
    rows: [row(1, "t2"), row(2, "t1"), row(3, "t3")],
    sourceRevisionMax: 1,
    updatedAt: at,
    playoffSpots: null,
    swiss: null,
    ...overrides,
  };
}

describe("standings", () => {
  it("keeps the server order and names rows only from known teams", () => {
    const rows = standingsTableRows(standings(), new Map([["t1", "Rayo"]]));
    expect(rows.map((row) => row.row.teamId)).toEqual(["t2", "t1", "t3"]);
    expect(rows.map((row) => row.teamName)).toEqual([null, "Rayo", null]);
    expect(standingsTableRows(standings(), undefined).every((row) => row.teamName === null)).toBe(
      true,
    );
  });

  it("marks the playoff cut only when teams sit on both sides of it", () => {
    expect(playoffCut(standings({ playoffSpots: 2 }))).toBe(2);
    expect(playoffCut(standings({ playoffSpots: 3 }))).toBeNull();
    const rows = standingsTableRows(standings({ playoffSpots: 2 }), undefined);
    expect(rows.map((row) => row.lastAboveCut)).toEqual([false, true, false]);
  });

  it("reads Swiss progress", () => {
    expect(swissStandingsProgress(null)).toBeNull();
    const swiss = { roundsTotal: 5, roundsCompleted: 2, currentRound: 3, isFinal: false };
    expect(swissStandingsProgress(swiss)).toEqual({ kind: "round", current: 3, total: 5 });
    expect(swissStandingsProgress({ ...swiss, currentRound: null })).toEqual({
      kind: "between",
      completed: 2,
      total: 5,
    });
    expect(swissStandingsProgress({ ...swiss, isFinal: true })).toEqual({ kind: "final" });
  });
});

function ranking(rows: RankingSnapshotDto["rows"]): RankingSnapshotDto {
  return {
    competitionId: "comp-1",
    organizationId: "org-1",
    kind: "scorer",
    formulaVersion: "player-ranking-v1",
    eligibility: { minimumMatches: 1, minimumTeamMinutesRatio: 0.5 },
    rows,
    sourceRevisionMax: 1,
    updatedAt: at,
  };
}

function roster(teamId: string, name: string, players: [string, string][]) {
  return {
    team: { id: teamId, name },
    members: players.map(([playerProfileId, displayName]) => ({
      membership: { playerProfileId },
      presentation: { displayName },
    })),
  } as unknown as CompetitionTeamManagementDetailResponse;
}

describe("rankings", () => {
  const rows = [
    { position: 1, playerProfileId: "p1", teamId: "t1", value: 4, matchesPlayed: 2, minutes: 180 },
    { position: 2, playerProfileId: "p2", teamId: null, value: 3, matchesPlayed: 2, minutes: 180 },
    { position: 3, playerProfileId: "p3", teamId: "t1", value: 1, matchesPlayed: 2, minutes: 180 },
  ];

  it("selects a kind and tells a missing projection apart", () => {
    const snapshot = ranking(rows);
    expect(selectRankingSnapshot({ rankings: [snapshot] }, "scorer")).toBe(snapshot);
    expect(selectRankingSnapshot({ rankings: [snapshot] }, "mvp")).toBeNull();
    expect(rankingTeamIds(snapshot)).toEqual(["t1"]);
    expect(rankingTeamIds(null)).toEqual([]);
  });

  it("names a row only from its own team's roster", () => {
    const names = rankingNamesFromTeams([
      roster("t1", "Rayo", [["p1", "Ana"]]),
      roster("t2", "Norte", [
        ["p2", "Bea"],
        ["p3", "Not this one"],
      ]),
    ]);
    expect(names.teams.get("t1")).toBe("Rayo");
    expect(rankingPlayerName(names, rows[0]!)).toBe("Ana");
    expect(rankingPlayerName(names, rows[1]!)).toBe("Bea");
    expect(rankingPlayerName(names, rows[2]!)).toBeUndefined();
  });
});

describe("rules", () => {
  const draft = (
    format: CompetitionDraftDto["competition"]["format"],
    knockout: boolean,
  ): CompetitionDraftDto => {
    const stage = {
      officialMatchesPerEncounter: 2 as const,
      resolutionMode: "aggregate_score" as const,
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      allowRescheduling: false,
      maxReschedulesPerTeam: null,
      minimumRescheduleNoticeHours: 24,
      rescheduleProposalExpiryHours: 12,
      rescheduleRequiresOpponentApproval: true,
      rescheduleRequiresOrganizerApproval: false,
    };
    return {
      competition: { format } as CompetitionDraftDto["competition"],
      rules: {
        version: 1,
        regularStage: stage,
        knockoutStage: knockout ? { ...stage, officialMatchesPerEncounter: 1 } : null,
        awayGoalsEnabled: false,
        maxRosterSize: null,
        rankingEligibility: null,
        createdAt: at,
      },
    };
  };

  it("lists the defined stages with the format's stage names", () => {
    expect(rulesStages(draft("league-playoffs", true)).map((stage) => stage.label)).toEqual([
      "league",
      "playoffs",
    ]);
    expect(rulesStages(draft("groups-knockout", false)).map((stage) => stage.label)).toEqual([
      "groups",
    ]);
  });

  it("shows a resolution only for two-match ties and adds Buchholz for Swiss", () => {
    const [regular, knockout] = rulesStages(draft("league-playoffs", true));
    expect(showsResolution(regular!.rules)).toBe(true);
    expect(showsResolution(knockout!.rules)).toBe(false);
    expect(tiebreakCriteria("swiss")).toContain("buchholz");
    expect(tiebreakCriteria("league")).not.toContain("buchholz");
  });
});
