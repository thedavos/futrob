import { z } from "zod";

export const REQUEST_ID_HEADER = "X-Request-ID";

export const requestIdSchema = z.string().uuid();
export type RequestId = z.infer<typeof requestIdSchema>;

export const requestCorrelationSchema = z.object({
  requestId: requestIdSchema,
});
export type RequestCorrelation = z.infer<typeof requestCorrelationSchema>;
