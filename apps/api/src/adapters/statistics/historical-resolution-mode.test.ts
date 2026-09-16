import { describe, expect, it } from "vite-plus/test";
import type { CompetitionRepository, CompetitionRules } from "@futrob/competitions";
import {
  asEncounterStageId,
  type EncounterReaderPort,
  type EncounterScheduleSnapshot,
} from "@futrob/results";
import { asCompetitionId, asEncounterId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { buildCompetitionStandings } from "@futrob/statistics";
import { CompetitionsMatchRulesReader } from "./competition-match-rules-reader.ts";
import { historicalResolutionModeByEncounter } from "./historical-resolution-mode.ts";
import { rehydrateTeamContributions } from "./team-postgres-rows.ts";
import { contributionRow, twoSlotSeriesRows } from "./team-contribution-row.fixture.ts";

describe("historicalResolutionModeByEncounter", () => {
  it("rehydrates a legacy knockout two-slot series as one aggregated table match", async () => {
    const rows = twoSlotSeriesRows();
    const historical = await historicalResolutionModeByEncounter({
      rows,
      encounterReader: encounterReaderWith("plan:fixture:stage:2"),
      matchRules: new CompetitionsMatchRulesReader(repoWith(leaguePlayoffsRules())),
    });
    const contributions = rehydrateTeamContributions(rows, historical);
    const snapshot = buildCompetitionStandings({
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      contributions,
      pointsRules: {
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        resolutionMode: "independent_matches",
      },
      updatedAt: new Date("2026-08-13T12:00:00.000Z"),
    });

    expect(contributions.map((row) => row.resolutionMode)).toEqual([
      "aggregate_score",
      "aggregate_score",
      "aggregate_score",
      "aggregate_score",
    ]);
    expect(snapshot.rows.find((row) => row.teamId === asTeamId("away-team"))).toMatchObject({
      played: 1,
      wins: 1,
      losses: 0,
      points: 3,
      goalsFor: 2,
      goalsAgainst: 1,
    });
    expect(snapshot.rows.find((row) => row.teamId === asTeamId("home-team"))).toMatchObject({
      played: 1,
      wins: 0,
      losses: 1,
      points: 0,
      goalsFor: 1,
      goalsAgainst: 2,
    });
  });

  it("keeps a legacy regular two-slot series as independent matches", async () => {
    const rows = twoSlotSeriesRows();
    const historical = await historicalResolutionModeByEncounter({
      rows,
      encounterReader: encounterReaderWith("plan:fixture:stage:1"),
      matchRules: new CompetitionsMatchRulesReader(repoWith(leaguePlayoffsRules())),
    });
    const contributions = rehydrateTeamContributions(rows, historical);
    const snapshot = buildCompetitionStandings({
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      contributions,
      pointsRules: {
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        resolutionMode: "independent_matches",
      },
      updatedAt: new Date("2026-08-13T12:00:00.000Z"),
    });

    expect(contributions.map((row) => row.resolutionMode)).toEqual([
      "independent_matches",
      "independent_matches",
      "independent_matches",
      "independent_matches",
    ]);
    expect(snapshot.rows.find((row) => row.teamId === asTeamId("home-team"))).toMatchObject({
      played: 2,
      wins: 1,
      losses: 1,
      points: 3,
      goalsFor: 1,
      goalsAgainst: 2,
    });
  });

  it("skips lookup when the contribution id already freezes the mode", async () => {
    const rows = [
      contributionRow({
        id: "result-1:1:1:home:independent_matches",
        encounter_id: "encounter-frozen",
        resolution_mode: null,
      }),
    ];
    const encounterReader: EncounterReaderPort = {
      async getById() {
        throw new Error("frozen rows must not look up encounter stage rules");
      },
    };

    const historical = await historicalResolutionModeByEncounter({
      rows,
      encounterReader,
      matchRules: new CompetitionsMatchRulesReader(repoWith(leaguePlayoffsRules())),
    });

    expect(historical.size).toBe(0);
    expect(rehydrateTeamContributions(rows, historical)[0]?.resolutionMode).toBe(
      "independent_matches",
    );
  });

  it("fails when a pre-PR row has no encounter to recover stage rules from", async () => {
    await expect(
      historicalResolutionModeByEncounter({
        rows: twoSlotSeriesRows(),
        encounterReader: {
          async getById() {
            return null;
          },
        },
        matchRules: new CompetitionsMatchRulesReader(repoWith(leaguePlayoffsRules())),
      }),
    ).rejects.toThrow(/encounter encounter-two-slot is missing for historical resolutionMode/);
  });

  it("fails when a pre-PR row has no competition match rules", async () => {
    await expect(
      historicalResolutionModeByEncounter({
        rows: twoSlotSeriesRows(),
        encounterReader: encounterReaderWith("plan:fixture:stage:2"),
        matchRules: new CompetitionsMatchRulesReader(
          repoWith(leaguePlayoffsRules("other-competition")),
        ),
      }),
    ).rejects.toThrow(/competition match rules are missing for historical resolutionMode/);
  });
});

function encounterReaderWith(stageId: string): EncounterReaderPort {
  const snapshot: EncounterScheduleSnapshot = {
    encounterId: asEncounterId("encounter-two-slot"),
    organizationId: asOrganizationId("organization-1"),
    competitionId: asCompetitionId("competition-1"),
    stageId: asEncounterStageId(stageId),
    homeTeamId: asTeamId("home-team"),
    awayTeamId: asTeamId("away-team"),
    scheduledStartAt: new Date("2026-08-10T19:00:00.000Z"),
    officialMatchCount: 2,
    homeExternalClubId: "club-1",
    awayExternalClubId: "club-2",
    providerKey: "ea-clubs",
  };
  return {
    async getById(encounterId) {
      return encounterId === snapshot.encounterId ? snapshot : null;
    },
  };
}

function repoWith(rules: CompetitionRules): CompetitionRepository {
  return {
    async saveDraft(draft) {
      return draft;
    },
    async findById() {
      return null;
    },
    async findByCreationKey() {
      return null;
    },
    async findRulesByCompetitionId(competitionId) {
      return competitionId === rules.competitionId ? rules : null;
    },
    async listByOrganization() {
      return [];
    },
  };
}

function leaguePlayoffsRules(competitionId = "competition-1"): CompetitionRules {
  return {
    competitionId: asCompetitionId(competitionId),
    version: 1,
    regularStage: {
      officialMatchesPerEncounter: 2,
      resolutionMode: "independent_matches",
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      allowRescheduling: true,
      maxReschedulesPerTeam: 2,
      minimumRescheduleNoticeHours: 12,
      rescheduleRequiresOpponentApproval: true,
      rescheduleRequiresOrganizerApproval: false,
    },
    knockoutStage: {
      officialMatchesPerEncounter: 2,
      resolutionMode: "aggregate_score",
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      allowRescheduling: true,
      maxReschedulesPerTeam: 2,
      minimumRescheduleNoticeHours: 12,
      rescheduleRequiresOpponentApproval: true,
      rescheduleRequiresOrganizerApproval: false,
    },
    awayGoalsEnabled: false,
    maxRosterSize: null,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
  };
}
