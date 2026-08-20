import { z } from "zod";

/** JSON value returned by `response.json()` before schema parsing at resource boundaries. */
export type HttpResponseBody =
  | null
  | boolean
  | number
  | string
  | HttpResponseBody[]
  | { [key: string]: HttpResponseBody };

export const httpResponseBodySchema: z.ZodType<HttpResponseBody> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number(),
    z.string(),
    z.array(httpResponseBodySchema),
    z.record(z.string(), httpResponseBodySchema),
  ]),
);
