import { z } from "zod";

export const healthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.literal("futrob"),
  apiVersion: z.literal("v1"),
  db: z.enum(["ok", "skipped", "error"]),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
