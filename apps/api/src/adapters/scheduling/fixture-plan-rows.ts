import {
  asFixtureStageId,
  asFixtureRoundId,
  type FixtureEncounter,
  type FixtureParticipantSlot,
  type FixturePlan,
  type FixtureStage,
} from "@futrob/scheduling";
import { fixtureParticipantSlotSchema } from "@futrob/api-contracts";
import {
  asCompetitionId,
  asEncounterId,
  asOfficialMatchSlotId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import { z } from "zod";
import { parseJsonColumn, type PgJsonInput } from "@/adapters/persistence/parse-json-column.ts";
import { pgTextSchema, pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";

export function rehydratePlan(
  row: PlanRow,
  stageRows: readonly unknown[],
  roundRows: readonly unknown[],
  encounterRows: readonly unknown[],
): FixturePlan {
  const rounds = roundRows.map((roundRow) => roundRowSchema.parse(roundRow));
  const encounters = encounterRows.map((encounterRow) => encounterRowSchema.parse(encounterRow));
  const stages = stageRows.map((stageRow) => {
    const stage = stageRowSchema.parse(stageRow);
    const stageId = asFixtureStageId(stage.id);
    return {
      id: stageId,
      kind: stage.kind,
      order: stage.stage_order,
      rounds: rounds
        .filter((round) => round.stage_id === stage.id)
        .map((round) => ({
          id: asFixtureRoundId(round.id),
          stageId,
          number: round.round_number,
          scheduledStartAt: round.scheduled_start_at,
          encounters: encounters
            .filter((encounter) => encounter.round_id === round.id)
            .map(rehydrateEncounter),
        })),
    } satisfies FixtureStage;
  });
  return {
    id: row.id,
    revision: row.revision,
    status: row.status,
    generationKey: row.generation_key,
    generationFingerprint: row.generation_fingerprint,
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    rulesVersion: row.rules_version,
    generationVersion: row.generation_version,
    format: row.format,
    timeZone: row.time_zone,
    homeAndAway: row.home_and_away,
    seed: seedArraySchema.parse(parseJsonColumn(z.unknown(), row.seed)).map(asTeamId),
    stages,
  };
}

export function rehydrateEncounter(row: EncounterRow): FixtureEncounter {
  const id = asEncounterId(row.id);
  const officialMatchCount = officialMatchCountSchema.parse(row.official_match_count);
  const slots: readonly (1 | 2)[] = officialMatchCount === 1 ? [1] : [1, 2];
  const encounter: FixtureEncounter = {
    id,
    stageId: asFixtureStageId(row.stage_id),
    roundId: asFixtureRoundId(row.round_id),
    order: row.encounter_order,
    home: parseParticipantSlot(row.home_slot),
    away: parseParticipantSlot(row.away_slot),
    scheduledStartAt: row.scheduled_start_at,
    officialMatchCount,
    series:
      row.series_id && row.resolution_mode
        ? {
            id: row.series_id,
            resolutionMode: row.resolution_mode,
            officialMatches: slots.map((matchSlot) => ({
              id: asOfficialMatchSlotId(`${id}:official-match:${matchSlot}`),
              slot: matchSlot,
            })),
          }
        : null,
  };
  if (row.group_id) {
    return { ...encounter, groupId: row.group_id };
  }
  return encounter;
}

function parseParticipantSlot(value: PgJsonInput): FixtureParticipantSlot {
  const parsed = parseJsonColumn(fixtureParticipantSlotSchema, value);
  switch (parsed.kind) {
    case "team":
      return { kind: "team", teamId: asTeamId(parsed.teamId) };
    case "bye":
      return { kind: "bye" };
    case "winner":
      return { kind: "winner", encounterId: asEncounterId(parsed.encounterId) };
    case "group-rank":
      return {
        kind: "group-rank",
        stageId: asFixtureStageId(parsed.stageId),
        groupId: parsed.groupId,
        rank: parsed.rank,
      };
    case "stage-rank":
      return {
        kind: "stage-rank",
        stageId: asFixtureStageId(parsed.stageId),
        rank: parsed.rank,
      };
    default: {
      const _exhaustive: never = parsed;
      throw new Error(`Invalid fixture participant slot: ${String(_exhaustive)}`);
    }
  }
}

const officialMatchCountSchema = z.union([z.literal(1), z.literal(2)]);
const fixtureStageKindSchema = z.enum(["league", "groups", "knockout", "playoffs"]);
const resolutionModeSchema = z.enum(["independent_matches", "aggregate_score"]);
const fixturePlanStatusSchema = z.enum(["active", "superseded"]);
const fixturePlanFormatSchema = z.enum([
  "league",
  "knockout",
  "groups-knockout",
  "league-playoffs",
]);
const seedArraySchema = z.array(z.string());
export const idRowSchema = z.object({ id: pgTextSchema });

export const planRowSchema = z.object({
  id: z.string(),
  revision: z.coerce.number(),
  status: fixturePlanStatusSchema,
  generation_key: z.string(),
  generation_fingerprint: z.string(),
  organization_id: z.string(),
  competition_id: z.string(),
  rules_version: z.coerce.number(),
  generation_version: z.coerce.number(),
  format: fixturePlanFormatSchema,
  time_zone: z.string(),
  home_and_away: z.coerce.boolean(),
  seed: z.unknown(),
});

const stageRowSchema = z.object({
  id: z.string(),
  kind: fixtureStageKindSchema,
  stage_order: z.coerce.number(),
});

const roundRowSchema = z.object({
  id: z.string(),
  stage_id: z.string(),
  round_number: z.coerce.number(),
  scheduled_start_at: pgTimestampSchema,
});

export const encounterRowSchema = z.object({
  id: z.string(),
  stage_id: z.string(),
  round_id: z.string(),
  encounter_order: z.coerce.number(),
  group_id: z.string().nullable(),
  home_slot: z.unknown(),
  away_slot: z.unknown(),
  scheduled_start_at: pgTimestampSchema,
  official_match_count: z.coerce.number(),
  series_id: z.string().nullable(),
  resolution_mode: resolutionModeSchema.nullable(),
});

export type PlanRow = z.infer<typeof planRowSchema>;
export type EncounterRow = z.infer<typeof encounterRowSchema>;

export function versionKey(
  organizationId: string,
  competitionId: string,
  generationVersion: number,
): string {
  return `${organizationId}\u0000${competitionId}\u0000${generationVersion}`;
}
