import { z } from "zod";

export const pgTextSchema = z.union([
  z.string(),
  z.number().transform(String),
  z.bigint().transform(String),
]);

export const pgNullableTextSchema = z
  .union([z.null(), z.undefined(), pgTextSchema])
  .transform((value) => (value === null || value === undefined ? null : value));

export const pgTimestampSchema = z
  .union([z.date(), z.string()])
  .transform((value) => (value instanceof Date ? value : new Date(value)));
