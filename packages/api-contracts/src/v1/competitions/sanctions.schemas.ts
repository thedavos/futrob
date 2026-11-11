import { z } from "zod";

/** Shared with the domain (ADR-0028). */
export const SANCTION_LIMITS = {
  reasonMinLength: 3,
  reasonMaxLength: 500,
  maxPointsDeducted: 100,
  maxSuspensionMatches: 20,
} as const;

export const sanctionTypeSchema = z.enum([
  "warning",
  "points_deduction",
  "match_suspension",
  "administrative_defeat",
]);
export type SanctionTypeDto = z.infer<typeof sanctionTypeSchema>;

export const sanctionTargetTypeSchema = z.enum(["team", "player"]);
export type SanctionTargetTypeDto = z.infer<typeof sanctionTargetTypeSchema>;

const reasonSchema = z
  .string()
  .trim()
  .min(SANCTION_LIMITS.reasonMinLength)
  .max(SANCTION_LIMITS.reasonMaxLength);

/** Who withdrew the sanction, why and when. */
export const sanctionRevocationSchema = z.object({
  actorId: z.string().min(1),
  revokedAt: z.string().datetime(),
  reason: z.string(),
  requestId: z.string(),
});
export type SanctionRevocationDto = z.infer<typeof sanctionRevocationSchema>;

/** A sanction with its audit trail. It is never deleted: `revocation` marks it withdrawn. */
export const competitionSanctionSchema = z.object({
  id: z.string().min(1),
  competitionId: z.string().min(1),
  targetType: sanctionTargetTypeSchema,
  teamId: z.string().min(1),
  teamName: z.string().nullable(),
  playerProfileId: z.string().nullable(),
  playerName: z.string().nullable(),
  type: sanctionTypeSchema,
  pointsDeducted: z.number().int().nullable(),
  suspensionMatches: z.number().int().nullable(),
  encounterId: z.string().nullable(),
  reason: z.string(),
  imposedByActorId: z.string().min(1),
  imposedAt: z.string().datetime(),
  requestId: z.string(),
  revocation: sanctionRevocationSchema.nullable(),
});
export type CompetitionSanctionDto = z.infer<typeof competitionSanctionSchema>;

export const listCompetitionSanctionsResponseSchema = z.object({
  sanctions: z.array(competitionSanctionSchema),
});
export type ListCompetitionSanctionsResponse = z.infer<
  typeof listCompetitionSanctionsResponseSchema
>;

/** Type-specific detail is checked by the domain; the wire only checks shapes. */
export const imposeSanctionRequestSchema = z.object({
  target: z.discriminatedUnion("type", [
    z.object({ type: z.literal("team"), teamId: z.string().trim().min(1) }),
    z.object({ type: z.literal("player"), playerProfileId: z.string().trim().min(1) }),
  ]),
  type: sanctionTypeSchema,
  reason: reasonSchema,
  pointsDeducted: z.number().int().nullable().optional(),
  suspensionMatches: z.number().int().nullable().optional(),
  encounterId: z.string().trim().min(1).nullable().optional(),
});
export type ImposeSanctionRequest = z.infer<typeof imposeSanctionRequestSchema>;

export const revokeSanctionRequestSchema = z.object({ reason: reasonSchema });
export type RevokeSanctionRequest = z.infer<typeof revokeSanctionRequestSchema>;
