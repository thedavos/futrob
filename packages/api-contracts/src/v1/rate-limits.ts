import { z } from "zod";

/** Policies the web BFF asks the product API to count (ADR-0034). */
export const RATE_LIMIT_POLICY = {
  eaClubSearch: "ea-club-search",
  invitationAccept: "invitation-accept",
  invitationPreview: "invitation-preview",
  invitationPublicPreview: "invitation-public-preview",
  playerSearch: "player-search",
  publicClubSearch: "public-club-search",
  publicCompetitionExplore: "public-competition-explore",
} as const;

export const rateLimitPolicySchema = z.enum([
  RATE_LIMIT_POLICY.eaClubSearch,
  RATE_LIMIT_POLICY.invitationAccept,
  RATE_LIMIT_POLICY.invitationPreview,
  RATE_LIMIT_POLICY.invitationPublicPreview,
  RATE_LIMIT_POLICY.playerSearch,
  RATE_LIMIT_POLICY.publicClubSearch,
  RATE_LIMIT_POLICY.publicCompetitionExplore,
]);
export type RateLimitPolicy = z.infer<typeof rateLimitPolicySchema>;

export const checkRateLimitRequestSchema = z.object({
  policy: rateLimitPolicySchema,
  /** `null` for a signed-out request, which is counted by IP alone. */
  actorId: z.string().min(1).nullable(),
  /** Client IP the caller saw (for web, `CF-Connecting-IP`). Stored only as an HMAC. */
  clientIp: z.string().min(1).max(64),
});
export type CheckRateLimitRequest = z.infer<typeof checkRateLimitRequestSchema>;

export const checkRateLimitResponseSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("allowed") }),
  z.object({
    outcome: z.literal("limited"),
    retryAfterSeconds: z.number().int().positive(),
    limitedBy: z.enum(["actor", "ip"]),
  }),
]);
export type CheckRateLimitResponse = z.infer<typeof checkRateLimitResponseSchema>;
