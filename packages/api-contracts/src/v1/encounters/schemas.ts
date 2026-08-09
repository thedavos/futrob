import { z } from "zod";

export const encounterScheduleSnapshotSchema = z.object({
  encounterId: z.string().min(1),
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  scheduledStartAt: z.string().datetime(),
  officialMatchCount: z.union([z.literal(1), z.literal(2)]),
  homeExternalClubId: z.string().min(1).nullable(),
  awayExternalClubId: z.string().min(1).nullable(),
  providerKey: z.string().min(1).nullable(),
});

export type EncounterScheduleSnapshotDto = z.infer<typeof encounterScheduleSnapshotSchema>;

export const upsertEncounterScheduleSnapshotRequestSchema = z.object({
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  scheduledStartAt: z.string().datetime(),
  officialMatchCount: z.union([z.literal(1), z.literal(2)]),
});

export type UpsertEncounterScheduleSnapshotRequest = z.infer<
  typeof upsertEncounterScheduleSnapshotRequestSchema
>;
