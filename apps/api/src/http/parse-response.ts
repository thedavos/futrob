import type { z } from "zod";

export async function parseResponse<TSchema extends z.ZodType>(
  schema: TSchema,
  response: Response,
): Promise<z.infer<TSchema>> {
  return schema.parse(await response.json());
}
