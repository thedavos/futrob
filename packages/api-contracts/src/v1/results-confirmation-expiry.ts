import { z } from "zod";

export const runConfirmationExpiryResponseSchema = z.object({
  expired: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});
