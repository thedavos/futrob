import type { z } from "zod";
import { parseJsonColumn, type PgJsonInput } from "@/adapters/persistence/parse-json-column.ts";

export function parseJsonRecord<TSchema extends z.ZodType>(
  schema: TSchema,
  value: PgJsonInput,
): z.infer<TSchema> {
  return parseJsonColumn(schema, value);
}

export function nullableNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

export function parseDate(value: string | Date): Date {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

export function parseOfficialSlot(value: number | string): 1 | 2 {
  const numeric = Number(value);
  if (numeric === 1 || numeric === 2) return numeric;
  throw new RangeError(`Invalid official slot: ${value}`);
}
