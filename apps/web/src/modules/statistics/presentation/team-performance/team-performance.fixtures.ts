import type { TeamDto, TeamPerformanceRankingSnapshotDto } from "@futrob/api-contracts";

type Row = TeamPerformanceRankingSnapshotDto["rows"][number];

const evidence = (overrides: Partial<Row["evidence"]> = {}): Row["evidence"] => ({
  resultPoints: 0,
  resultMaximum: 9,
  goalDifferencePerUnit: 0,
  comparableMinimum: -2,
  comparableMaximum: 2,
  recentPoints: 0,
  recentMaximum: 9,
  goalsFor: 0,
  goalsAgainst: 0,
  shotsFor: 12,
  shotsAgainst: 12,
  ...overrides,
});

const coverage = (overrides: Partial<Row["coverage"]> = {}): Row["coverage"] => ({
  encounters: 3,
  competitiveUnits: 3,
  officialMatches: 3,
  recentEncounters: 3,
  attackingMatches: 3,
  defendingMatches: 3,
  reason: "complete",
  ...overrides,
});

/** Typed story/test data shaped by the literal examples in `product/team-performance-v1.md`. */
export const TEAM_PERFORMANCE_ROWS: readonly Row[] = [
  {
    teamId: "team-cuervos",
    position: 1,
    status: "scored",
    score: 95,
    components: {
      results: 100,
      goalDifference: 100,
      recentForm: 100,
      offensiveEfficiency: 50,
      defensiveEfficiency: 100,
    },
    missing: [],
    coverage: coverage(),
    evidence: evidence({
      resultPoints: 9,
      goalDifferencePerUnit: 2,
      recentPoints: 9,
      goalsFor: 6,
      goalsAgainst: 0,
    }),
    sourceContributionIds: ["contribution-1", "contribution-2", "contribution-3"],
  },
  {
    teamId: "team-halcones",
    position: 2,
    status: "scored",
    score: 40,
    components: {
      results: 100 / 3,
      goalDifference: 50,
      recentForm: 100 / 3,
      offensiveEfficiency: 50,
      defensiveEfficiency: 50,
    },
    missing: [],
    coverage: coverage(),
    evidence: evidence({ resultPoints: 3, recentPoints: 3, goalsFor: 3, goalsAgainst: 3 }),
    sourceContributionIds: ["contribution-4", "contribution-5", "contribution-6"],
  },
  {
    teamId: "team-maderas",
    position: 3,
    status: "scored",
    score: 5,
    components: {
      results: 0,
      goalDifference: 0,
      recentForm: 0,
      offensiveEfficiency: 0,
      defensiveEfficiency: 50,
    },
    missing: [],
    coverage: coverage(),
    evidence: evidence({ goalDifferencePerUnit: -2, goalsFor: 0, goalsAgainst: 6 }),
    sourceContributionIds: ["contribution-7", "contribution-8", "contribution-9"],
  },
  {
    teamId: "team-pumas",
    position: null,
    status: "incomplete",
    score: null,
    components: {
      results: 66.66666666666667,
      goalDifference: 62.5,
      recentForm: 66.66666666666667,
      offensiveEfficiency: 40,
      defensiveEfficiency: null,
    },
    missing: ["defensiveEfficiency"],
    coverage: coverage({ defendingMatches: 2, reason: "missing_components" }),
    evidence: evidence({
      resultPoints: 6,
      goalDifferencePerUnit: 0.5,
      recentPoints: 6,
      goalsFor: 4,
      goalsAgainst: 2,
      shotsAgainst: null,
    }),
    sourceContributionIds: ["contribution-10", "contribution-11", "contribution-12"],
  },
  {
    teamId: "team-tiburones-del-pacifico",
    position: null,
    status: "incomplete",
    score: null,
    components: {
      results: null,
      goalDifference: null,
      recentForm: null,
      offensiveEfficiency: null,
      defensiveEfficiency: null,
    },
    missing: [
      "results",
      "goalDifference",
      "recentForm",
      "offensiveEfficiency",
      "defensiveEfficiency",
    ],
    coverage: coverage({
      encounters: 2,
      competitiveUnits: 2,
      officialMatches: 2,
      recentEncounters: 2,
      attackingMatches: 2,
      defendingMatches: 2,
      reason: "insufficient_sample",
    }),
    evidence: evidence({ resultMaximum: 6, recentMaximum: 6, goalDifferencePerUnit: null }),
    sourceContributionIds: ["contribution-13", "contribution-14"],
  },
  {
    teamId: "team-sin-nombre",
    position: null,
    status: "incomplete",
    score: null,
    components: {
      results: null,
      goalDifference: null,
      recentForm: null,
      offensiveEfficiency: null,
      defensiveEfficiency: null,
    },
    missing: [
      "results",
      "goalDifference",
      "recentForm",
      "offensiveEfficiency",
      "defensiveEfficiency",
    ],
    coverage: coverage({
      encounters: 0,
      competitiveUnits: 0,
      officialMatches: 0,
      recentEncounters: 0,
      attackingMatches: 0,
      defendingMatches: 0,
      reason: "no_data",
    }),
    evidence: evidence({
      resultMaximum: 0,
      recentMaximum: 0,
      goalDifferencePerUnit: null,
      shotsFor: null,
      shotsAgainst: null,
    }),
    sourceContributionIds: [],
  },
];

export function teamPerformanceRankingFixture(
  overrides: Partial<TeamPerformanceRankingSnapshotDto> = {},
): TeamPerformanceRankingSnapshotDto {
  return {
    organizationId: "org-1",
    competitionId: "competition-1",
    formulaVersion: "team-performance-v1",
    normalizationVersion: "team-performance-normalization-v1",
    windowVersion: "competition-all-form-5-min-3-v1",
    window: {
      kind: "competition_all",
      recentEncounterLimit: 5,
      minimumEncounters: 3,
      from: "2026-09-06T01:00:00.000Z",
      through: "2026-10-18T02:30:00.000Z",
    },
    revisionFingerprint: "a".repeat(64),
    sources: [
      { officialResultId: "result-1", encounterId: "encounter-1", revision: 1, status: "approved" },
      { officialResultId: "result-2", encounterId: "encounter-2", revision: 2, status: "approved" },
      { officialResultId: "result-3", encounterId: "encounter-3", revision: 1, status: "voided" },
    ],
    projectionComplete: true,
    unmatchedContributions: 0,
    rows: [...TEAM_PERFORMANCE_ROWS],
    updatedAt: "2026-10-18T03:00:00.000Z",
    ...overrides,
  };
}

/** Rows become incomplete together while a projection waits for reconstruction. */
export function projectionIncompleteFixture(): TeamPerformanceRankingSnapshotDto {
  return teamPerformanceRankingFixture({
    projectionComplete: false,
    unmatchedContributions: 2,
    rows: TEAM_PERFORMANCE_ROWS.slice(0, 3).map((row) => ({
      ...row,
      position: null,
      status: "incomplete",
      score: null,
      components: {
        results: null,
        goalDifference: null,
        recentForm: null,
        offensiveEfficiency: null,
        defensiveEfficiency: null,
      },
      missing: [
        "results",
        "goalDifference",
        "recentForm",
        "offensiveEfficiency",
        "defensiveEfficiency",
      ],
      coverage: { ...row.coverage, reason: "projection_incomplete" },
    })),
  });
}

/** `team-sin-nombre` is left out on purpose: names come from a separate read. */
export const TEAM_PERFORMANCE_TEAMS: readonly TeamDto[] = (
  [
    { id: "team-cuervos", name: "Cuervos FC" },
    { id: "team-halcones", name: "Halcones" },
    { id: "team-maderas", name: "Maderas FC" },
    { id: "team-pumas", name: "Pumas del Sur" },
    { id: "team-tiburones-del-pacifico", name: "Club Atlético Tiburones del Pacífico" },
  ] as const
).map((team) => ({ ...team, organizationId: "org-1", createdAt: "2026-08-01T12:00:00.000Z" }));
