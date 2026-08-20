import { z } from "zod";

export const pgJsonInputSchema = z.union([
  z.string().transform((text, ctx) => {
    try {
      return JSON.parse(text);
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid JSON string from Postgres" });
      return z.NEVER;
    }
  }),
  z.unknown(),
]);

export type PgJsonInput = z.input<typeof pgJsonInputSchema>;

export function parseJsonColumn<TSchema extends z.ZodType>(
  schema: TSchema,
  value: PgJsonInput,
): z.infer<TSchema> {
  return schema.parse(pgJsonInputSchema.parse(value));
}
