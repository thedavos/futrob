import { z } from "zod";

/** Expected TaggedError failures carry a stable wire `code`; those stay local. */
const expectedFailureSchema = z.object({ code: z.string() }).passthrough();

export function isExpectedFailure(cause: unknown): boolean {
  return expectedFailureSchema.safeParse(cause).success;
}
