import { z } from "zod";

export const API_ERROR_RESPONSE = { $ref: "#/components/responses/ApiError" } as const;

export const organizationIdParam = {
  name: "organizationId",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;

export const competitionIdParam = {
  name: "competitionId",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;

export const teamIdParam = {
  name: "teamId",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;

export const membershipIdParam = {
  name: "membershipId",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;

export const entryIdParam = {
  name: "entryId",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;

export function zodOpenApiSchema(schema: z.ZodType, io: "input" | "output") {
  return z.toJSONSchema(schema, { target: "draft-2020-12", io });
}

export function jsonContent(schemaName: string) {
  return {
    "application/json": { schema: { $ref: `#/components/schemas/${schemaName}` } },
  };
}
