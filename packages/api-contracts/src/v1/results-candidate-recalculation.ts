import { z } from "zod";

export const runCandidateRecalculationResponseSchema = z.object({
  recalculated: z.number().int().nonnegative(),
});
