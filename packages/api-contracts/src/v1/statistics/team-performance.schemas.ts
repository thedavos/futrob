import { z } from "zod";

export const teamPerformanceMetricSchema = z.enum([
  "results",
  "goalDifference",
  "recentForm",
  "offensiveEfficiency",
  "defensiveEfficiency",
]);
const component = z.number().min(0).max(100).nullable();
export const teamPerformanceComponentsSchema = z.object({
  results: component,
  goalDifference: component,
  recentForm: component,
  offensiveEfficiency: component,
  defensiveEfficiency: component,
});
export const teamPerformanceRankingRowSchema = z
  .object({
    teamId: z.string().min(1),
    position: z.number().int().positive().nullable(),
    status: z.enum(["scored", "incomplete"]),
    score: z.number().int().min(0).max(100).nullable(),
    components: teamPerformanceComponentsSchema,
    missing: z.array(teamPerformanceMetricSchema),
    coverage: z.object({
      encounters: z.number().int().nonnegative(),
      competitiveUnits: z.number().int().nonnegative(),
      officialMatches: z.number().int().nonnegative(),
      recentEncounters: z.number().int().min(0).max(5),
      attackingMatches: z.number().int().nonnegative(),
      defendingMatches: z.number().int().nonnegative(),
      reason: z.enum([
        "complete",
        "no_data",
        "insufficient_sample",
        "missing_components",
        "projection_incomplete",
      ]),
    }),
    evidence: z.object({
      resultPoints: z.number().nonnegative(),
      resultMaximum: z.number().nonnegative(),
      goalDifferencePerUnit: z.number().nullable(),
      comparableMinimum: z.number().nullable(),
      comparableMaximum: z.number().nullable(),
      recentPoints: z.number().nonnegative(),
      recentMaximum: z.number().nonnegative(),
      goalsFor: z.number().int().nonnegative(),
      goalsAgainst: z.number().int().nonnegative(),
      shotsFor: z.number().nonnegative().nullable(),
      shotsAgainst: z.number().nonnegative().nullable(),
    }),
    sourceContributionIds: z.array(z.string().min(1)),
  })
  .refine(
    (row) => {
      const missing = teamPerformanceMetricSchema.options.filter(
        (key) => row.components[key] === null,
      );
      return row.status === "scored"
        ? row.score !== null &&
            row.position !== null &&
            row.missing.length === 0 &&
            missing.length === 0
        : row.score === null &&
            row.position === null &&
            missing.length > 0 &&
            row.missing.length === missing.length &&
            missing.every((key) => row.missing.includes(key));
    },
    { message: "Score, position, components and missing keys must match ranking status." },
  );

export const teamPerformanceRankingSnapshotSchema = z.object({
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  formulaVersion: z.literal("team-performance-v1"),
  normalizationVersion: z.literal("team-performance-normalization-v1"),
  windowVersion: z.literal("competition-all-form-5-min-3-v1"),
  window: z.object({
    kind: z.literal("competition_all"),
    recentEncounterLimit: z.literal(5),
    minimumEncounters: z.literal(3),
    from: z.string().datetime().nullable(),
    through: z.string().datetime().nullable(),
  }),
  revisionFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  sources: z.array(
    z.object({
      officialResultId: z.string().min(1),
      encounterId: z.string().min(1),
      revision: z.number().int().positive(),
      status: z.enum(["approved", "voided"]),
    }),
  ),
  projectionComplete: z.boolean(),
  unmatchedContributions: z.number().int().nonnegative(),
  rows: z.array(teamPerformanceRankingRowSchema),
  updatedAt: z.string().datetime(),
});

export const getTeamPerformanceRankingResponseSchema = z.object({
  ranking: teamPerformanceRankingSnapshotSchema.nullable(),
});
export type TeamPerformanceRankingSnapshotDto = z.infer<
  typeof teamPerformanceRankingSnapshotSchema
>;
export type GetTeamPerformanceRankingResponse = z.infer<
  typeof getTeamPerformanceRankingResponseSchema
>;
