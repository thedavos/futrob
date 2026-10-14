import { z } from "zod";

export type RequiredAndEnumParity = {
  readonly zodRequired: readonly string[];
  readonly specRequired: readonly string[];
  readonly zodEnums: readonly string[];
  readonly specEnums: readonly string[];
};

const jsonValueSchema = z.json();
const schemaNodeSchema = z
  .object({
    required: z.array(z.string()).optional(),
    enum: z.array(z.string()).optional(),
    const: z.string().optional(),
    properties: z.record(z.string(), z.json()).optional(),
    anyOf: z.array(z.json()).optional(),
    oneOf: z.array(z.json()).optional(),
    allOf: z.array(z.json()).optional(),
  })
  .passthrough();

type JsonValue = z.infer<typeof jsonValueSchema>;

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function schemaNode(value: JsonValue) {
  return schemaNodeSchema.safeParse(value);
}

/** Root `required` plus `required` on each union member. Does not follow `$ref`. */
function collectedRequired(schema: JsonValue): string[] {
  const node = schemaNode(schema);
  if (!node.success) return [];
  const nested = [
    ...(node.data.anyOf ?? []),
    ...(node.data.oneOf ?? []),
    ...(node.data.allOf ?? []),
  ];
  return uniqueSorted([
    ...(node.data.required ?? []),
    ...nested.flatMap((member) => collectedRequired(member)),
  ]);
}

/** Root and property `enum` values, including union members. Does not follow `$ref`. */
function collectedEnums(schema: JsonValue): string[] {
  const node = schemaNode(schema);
  if (!node.success) return [];
  const fromProperties = Object.values(node.data.properties ?? {}).flatMap((property) => {
    const parsed = schemaNode(property);
    if (!parsed.success) return [];
    return [
      ...(parsed.data.enum ?? []),
      ...(parsed.data.const === undefined ? [] : [parsed.data.const]),
    ];
  });
  const nested = [
    ...(node.data.anyOf ?? []),
    ...(node.data.oneOf ?? []),
    ...(node.data.allOf ?? []),
  ];
  return uniqueSorted([
    ...(node.data.enum ?? []),
    ...(node.data.const === undefined ? [] : [node.data.const]),
    ...fromProperties,
    ...nested.flatMap((member) => collectedEnums(member)),
  ]);
}

export function requiredAndEnumParity(
  schema: z.ZodType,
  openApiSchema: JsonValue,
  io: "input" | "output",
): RequiredAndEnumParity {
  const zodJson = jsonValueSchema.parse(z.toJSONSchema(schema, { target: "draft-2020-12", io }));
  return {
    zodRequired: collectedRequired(zodJson),
    specRequired: collectedRequired(openApiSchema),
    zodEnums: collectedEnums(zodJson),
    specEnums: collectedEnums(openApiSchema),
  };
}

export function assertRequiredAndEnumParity(
  schema: z.ZodType,
  openApiSchema: JsonValue,
  io: "input" | "output",
): void {
  const parity = requiredAndEnumParity(schema, openApiSchema, io);
  if (parity.zodRequired.join("\0") !== parity.specRequired.join("\0")) {
    throw new Error(
      `required mismatch: zod=${JSON.stringify(parity.zodRequired)} spec=${JSON.stringify(parity.specRequired)}`,
    );
  }
  if (parity.zodEnums.join("\0") !== parity.specEnums.join("\0")) {
    throw new Error(
      `enum mismatch: zod=${JSON.stringify(parity.zodEnums)} spec=${JSON.stringify(parity.specEnums)}`,
    );
  }
}
