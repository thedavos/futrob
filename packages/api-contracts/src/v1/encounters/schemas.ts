import { z } from "zod";
import { externalClubSchema } from "../game-data/schemas.ts";
import { requestIdSchema } from "../request-correlation.ts";

const officialMatchStartsSchema = z
  .array(
    z.object({
      officialSlot: z.union([z.literal(1), z.literal(2)]),
      scheduledStartAt: z.string().datetime(),
    }),
  )
  .min(1)
  .max(2);

const seriesResolutionModeSchema = z.enum(["independent_matches", "aggregate_score"]);

export const encounterScheduleSnapshotSchema = z.object({
  encounterId: z.string().min(1),
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  stageId: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  scheduledStartAt: z.string().datetime(),
  officialMatchCount: z.union([z.literal(1), z.literal(2)]),
  homeExternalClubId: z.string().min(1).nullable(),
  awayExternalClubId: z.string().min(1).nullable(),
  providerKey: z.string().min(1).nullable(),
  /** Start of every slot the Encounter plays; an `official_match` reschedule moves one. */
  officialMatches: officialMatchStartsSchema,
});

export type EncounterScheduleSnapshotDto = z.infer<typeof encounterScheduleSnapshotSchema>;

export const upsertEncounterScheduleSnapshotRequestSchema = z.object({
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  stageId: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  scheduledStartAt: z.string().datetime(),
  officialMatchCount: z.union([z.literal(1), z.literal(2)]),
});

export type UpsertEncounterScheduleSnapshotRequest = z.infer<
  typeof upsertEncounterScheduleSnapshotRequestSchema
>;

export const fixtureParticipantSlotSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("team"), teamId: z.string().min(1) }),
  z.object({ kind: z.literal("bye") }),
  z.object({ kind: z.literal("winner"), encounterId: z.string().min(1) }),
  z.object({
    kind: z.literal("group-rank"),
    stageId: z.string().min(1),
    groupId: z.string().min(1),
    rank: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("stage-rank"),
    stageId: z.string().min(1),
    rank: z.number().int().positive(),
  }),
]);

export const fixtureSeriesSchema = z.object({
  id: z.string().min(1),
  resolutionMode: seriesResolutionModeSchema,
  officialMatches: z
    .array(
      z.object({
        id: z.string().min(1),
        slot: z.union([z.literal(1), z.literal(2)]),
      }),
    )
    .min(1)
    .max(2),
});

export const fixtureEncounterSchema = z.object({
  id: z.string().min(1),
  stageId: z.string().min(1),
  roundId: z.string().min(1),
  order: z.number().int().positive(),
  groupId: z.string().min(1).optional(),
  home: fixtureParticipantSlotSchema,
  away: fixtureParticipantSlotSchema,
  scheduledStartAt: z.string().datetime(),
  officialMatchCount: z.union([z.literal(1), z.literal(2)]),
  series: fixtureSeriesSchema.nullable(),
  /** Team vs Team with `series: null`: the organizer closed it and it will never have a result. */
  closedWithoutResult: z.literal(true).optional(),
});

export const fixtureRoundSchema = z.object({
  id: z.string().min(1),
  stageId: z.string().min(1),
  number: z.number().int().positive(),
  scheduledStartAt: z.string().datetime(),
  encounters: z.array(fixtureEncounterSchema),
});

const fixtureStageKindSchema = z.enum(["league", "groups", "knockout", "playoffs", "swiss"]);

export const fixtureStageSchema = z.object({
  id: z.string().min(1),
  kind: fixtureStageKindSchema,
  order: z.number().int().positive(),
  rounds: z.array(fixtureRoundSchema),
});

export const fixturePlanSchema = z.object({
  id: z.string().min(1),
  revision: z.number().int().positive(),
  status: z.enum(["active", "superseded"]),
  generationKey: z.string().min(1),
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  rulesVersion: z.number().int().positive(),
  generationVersion: z.number().int().positive(),
  format: z.enum(["league", "knockout", "groups-knockout", "league-playoffs", "swiss"]),
  timeZone: z.string().min(1),
  homeAndAway: z.boolean(),
  seed: z.array(z.string().min(1)).min(2),
  /** Swiss only. Teams left out of later pairings; their earlier results still count. */
  withdrawnTeamIds: z.array(z.string().min(1)).optional(),
  stages: z.array(fixtureStageSchema).min(1),
});

export type FixturePlanDto = z.infer<typeof fixturePlanSchema>;
export type FixtureEncounterDto = z.infer<typeof fixtureEncounterSchema>;
export type FixtureParticipantSlotDto = z.infer<typeof fixtureParticipantSlotSchema>;
export type FixtureStageDto = z.infer<typeof fixtureStageSchema>;

/**
 * The competition's current fixture with the name of every Team it places. `fixture`
 * is null until one is generated; a Team missing from `teams` no longer resolves.
 */
export const getCurrentCompetitionFixtureResponseSchema = z.object({
  fixture: fixturePlanSchema.nullable(),
  teams: z.array(z.object({ teamId: z.string().min(1), name: z.string().min(1) })),
});

export type GetCurrentCompetitionFixtureResponse = z.infer<
  typeof getCurrentCompetitionFixtureResponseSchema
>;

export const generateCompetitionFixtureRequestSchema = z.object({
  generationVersion: z.number().int().positive(),
  startsAt: z.string().datetime(),
  roundIntervalDays: z.number().int().positive(),
  homeAndAway: z.boolean().default(false),
  seed: z.array(z.string().min(1)).min(2).optional(),
  groups: z
    .object({
      count: z.number().int().min(2),
      qualifiersPerGroup: z.number().int().positive(),
    })
    .optional(),
  playoffs: z.object({ teamCount: z.number().int().min(2) }).optional(),
  swiss: z.object({ rounds: z.number().int().positive() }).optional(),
});

export type GenerateCompetitionFixtureRequest = z.infer<
  typeof generateCompetitionFixtureRequestSchema
>;

export const editFixtureEncounterRequestSchema = z
  .object({
    scheduledStartAt: z.string().datetime().optional(),
    homeTeamId: z.string().min(1).optional(),
    awayTeamId: z.string().min(1).optional(),
    reason: z.string().trim().min(1).max(500),
    requestId: requestIdSchema.optional(),
  })
  .superRefine((value, context) => {
    const changesSchedule = value.scheduledStartAt !== undefined;
    const changesPairing = value.homeTeamId !== undefined || value.awayTeamId !== undefined;
    if (!changesSchedule && !changesPairing) {
      context.addIssue({ code: "custom", message: "A schedule or pairing change is required" });
    }
    if ((value.homeTeamId === undefined) !== (value.awayTeamId === undefined)) {
      context.addIssue({ code: "custom", message: "Both Team IDs are required for a pairing" });
    }
    if (value.homeTeamId && value.homeTeamId === value.awayTeamId) {
      context.addIssue({ code: "custom", message: "Fixture Teams must be different" });
    }
  });

export type EditFixtureEncounterRequest = z.infer<typeof editFixtureEncounterRequestSchema>;

export const withdrawSwissTeamRequestSchema = z.object({
  teamId: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
  requestId: requestIdSchema.optional(),
});

export type WithdrawSwissTeamRequest = z.infer<typeof withdrawSwissTeamRequestSchema>;

export const closeSwissRoundRequestSchema = z.object({
  reason: z.string().trim().min(1).max(500),
  requestId: requestIdSchema.optional(),
});

export type CloseSwissRoundRequest = z.infer<typeof closeSwissRoundRequestSchema>;

/** Rounds a Swiss fixture of `teamCount` Teams gets unless the organizer chooses: ⌈log₂ n⌉. */
export function defaultSwissRounds(teamCount: number): number {
  return Math.ceil(Math.log2(teamCount));
}

/** Most rounds the API accepts for `teamCount` Teams: ⌊(n + 1) / 2⌋. */
export function maxSwissRounds(teamCount: number): number {
  return Math.floor((teamCount + 1) / 2);
}

export const nextEncounterSideSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(1),
  externalClub: externalClubSchema.nullable(),
});

export const nextEncounterSchema = z.object({
  encounterId: z.string().min(1),
  competition: z.object({
    id: z.string().min(1),
    organizationId: z.string().min(1),
    name: z.string().min(1),
    timeZone: z.string().min(1),
  }),
  round: z
    .object({
      number: z.number().int().positive(),
      total: z.number().int().positive().nullable(),
    })
    .nullable(),
  scheduledStartAt: z.string().datetime(),
  officialMatchCount: z.union([z.literal(1), z.literal(2)]),
  home: nextEncounterSideSchema,
  away: nextEncounterSideSchema,
});

export type NextEncounterDto = z.infer<typeof nextEncounterSchema>;

export const getMyNextEncounterResponseSchema = z.object({
  encounter: nextEncounterSchema.nullable(),
});

export type GetMyNextEncounterResponse = z.infer<typeof getMyNextEncounterResponseSchema>;

/** One Encounter as both participants and staff read it before acting on it. */
export const encounterViewSchema = nextEncounterSchema.extend({
  /** Null when the Encounter is not in an active fixture plan. */
  resolutionMode: seriesResolutionModeSchema.nullable(),
  /** Start of every slot the Encounter plays. */
  officialMatches: officialMatchStartsSchema,
});

export type EncounterViewDto = z.infer<typeof encounterViewSchema>;

/**
 * Where an Encounter stands from the competition list: `official` once an approved
 * official result exists, `awaiting_result` after its start without one.
 */
export const competitionEncounterStatusSchema = z.enum([
  "scheduled",
  "awaiting_result",
  "official",
]);

export type CompetitionEncounterStatusDto = z.infer<typeof competitionEncounterStatusSchema>;

/** Goals of one approved official match, oriented to the Encounter's home and away Teams. */
export const encounterMatchScoreSchema = z.object({
  homeGoals: z.number().int().nonnegative(),
  awayGoals: z.number().int().nonnegative(),
});

export type EncounterMatchScoreDto = z.infer<typeof encounterMatchScoreSchema>;

/** Stage a round belongs to; multi-stage formats restart round numbers in every stage. */
export const competitionEncounterStageSchema = z.object({
  id: z.string().min(1),
  kind: fixtureStageKindSchema,
  order: z.number().int().positive(),
});

export type CompetitionEncounterStageDto = z.infer<typeof competitionEncounterStageSchema>;

const fixtureRoundIdSchema = z.string().min(1);

/** Approved official match scores in slot order, home-oriented. */
const encounterScoreSchema = z.array(encounterMatchScoreSchema).min(1).max(2);

const competitionEncounterRoundSchema = z.object({
  /** Fixture round, unique across stages. */
  id: fixtureRoundIdSchema,
  number: z.number().int().positive(),
  /** Rounds in the round's stage. */
  total: z.number().int().positive().nullable(),
  stage: competitionEncounterStageSchema,
});

/** One Encounter as the API sends it: every field is present, even when null. */
export const competitionEncounterSchema = z.object({
  encounterId: z.string().min(1),
  round: competitionEncounterRoundSchema,
  scheduledStartAt: z.string().datetime(),
  officialMatchCount: z.union([z.literal(1), z.literal(2)]),
  resolutionMode: seriesResolutionModeSchema.nullable(),
  home: z.object({ teamId: z.string().min(1), name: z.string().min(1) }),
  away: z.object({ teamId: z.string().min(1), name: z.string().min(1) }),
  status: competitionEncounterStatusSchema,
  /** Null until official or unattributable. */
  score: encounterScoreSchema.nullable(),
});

/** Encounters of the competition's active fixture the actor may read, earliest first. */
export const listCompetitionEncountersResponseSchema = z.object({
  competition: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    timeZone: z.string().min(1),
  }),
  encounters: z.array(competitionEncounterSchema),
});

/**
 * What a client reads: the same response, also from a product API that predates round
 * identity, series mode or score. The web Worker can deploy before the API, so each of those
 * fields reads as null when missing. Use it to parse; the API parses with the strict schema.
 */
export const competitionEncounterReadSchema = competitionEncounterSchema.extend({
  round: competitionEncounterRoundSchema.extend({
    id: fixtureRoundIdSchema.nullable().default(null),
    stage: competitionEncounterStageSchema.nullable().default(null),
  }),
  resolutionMode: seriesResolutionModeSchema.nullable().default(null),
  score: encounterScoreSchema.nullable().default(null),
});

export const listCompetitionEncountersReadSchema = listCompetitionEncountersResponseSchema.extend({
  encounters: z.array(competitionEncounterReadSchema),
});

export type CompetitionEncounterDto = z.output<typeof competitionEncounterReadSchema>;
export type ListCompetitionEncountersResponse = z.output<
  typeof listCompetitionEncountersReadSchema
>;

export const encounterCandidateTeamSchema = z.object({
  externalClubId: z.string().min(1),
  name: z.string().min(1),
  goals: z.number().int().nonnegative(),
  imageUrl: z.string().nullable(),
});

export const encounterCandidateSchema = z.object({
  reference: z.object({
    providerKey: z.string().min(1),
    externalId: z.string().min(1),
  }),
  occurredAt: z.string().datetime(),
  home: encounterCandidateTeamSchema,
  away: encounterCandidateTeamSchema,
  game: z.object({
    edition: z.string().min(1),
    platform: z.string().min(1),
    mode: z.string().min(1),
  }),
  metadata: z.object({
    durationSeconds: z.number().int().nonnegative().nullable(),
    wasDisconnected: z.boolean(),
    winnerByForfeit: z.boolean(),
    completeness: z.enum(["complete", "partial", "unknown"]),
  }),
  playerObservationCount: z.number().int().nonnegative(),
});

export const listEncounterCandidatesResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ready"),
    window: z.object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    }),
    candidates: z.array(encounterCandidateSchema),
  }),
  z.object({
    status: z.literal("clubs_not_connected"),
    sides: z
      .array(z.enum(["home", "away"]))
      .min(1)
      .max(2),
  }),
  z.object({
    status: z.literal("provider_mismatch"),
  }),
]);

export type EncounterCandidateDto = z.infer<typeof encounterCandidateSchema>;
export type ListEncounterCandidatesResponse = z.infer<typeof listEncounterCandidatesResponseSchema>;
