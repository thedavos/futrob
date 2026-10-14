import { Validator } from "@seriousme/openapi-schema-validator";
import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";
import { futrobOpenApiV1 } from "./document.ts";

const jsonRecordSchema = z.record(z.string(), z.json());

function resolvePointer(root: unknown, pointer: string): unknown {
  if (!pointer.startsWith("#/")) {
    throw new Error(`External $ref is not supported: ${pointer}`);
  }
  let current = root;
  for (const raw of pointer.slice(2).split("/")) {
    const key = raw.replaceAll("~1", "/").replaceAll("~0", "~");
    const record = jsonRecordSchema.safeParse(current);
    if (!record.success || !(key in record.data)) {
      throw new Error(`Unresolvable $ref ${pointer}`);
    }
    current = record.data[key];
  }
  return current;
}

function collectRefs(document: unknown): string[] {
  const refs: string[] = [];
  JSON.stringify(document, (key, nested) => {
    if (key === "$ref") refs.push(z.string().parse(nested));
    return nested;
  });
  return refs;
}

describe("OpenAPI document validity", () => {
  it("is a valid OAS 3.1 specification whose $refs resolve", async () => {
    const document = jsonRecordSchema.parse(JSON.parse(JSON.stringify(futrobOpenApiV1)));
    const validator = new Validator();
    const result = await validator.validate(document);
    expect(result.valid, JSON.stringify(result.errors)).toBe(true);
    expect(validator.version).toBe("3.1");

    for (const ref of collectRefs(document)) {
      expect(resolvePointer(document, ref), ref).toBeDefined();
    }
  }, 60_000);
});
