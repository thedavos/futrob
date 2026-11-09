import { z } from "zod";

/**
 * `/player` search. `clubAssociation=failed` arrives once from onboarding when the provider
 * could not resolve the club; anything else is dropped instead of failing the route.
 */
export const playerHomeSearchSchema = z.object({
  clubAssociation: z.literal("failed").optional().catch(undefined),
});

export type PlayerHomeSearch = z.infer<typeof playerHomeSearchSchema>;
