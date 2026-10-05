import { describe, expect, it } from "vite-plus/test";
import { apiErrorSchema, futrobOpenApiV1 } from "@futrob/api-contracts";
import { buildApp, serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";

type JsonSchema = {
  readonly type?: string;
  readonly properties?: Record<string, JsonSchema>;
  readonly required?: readonly string[];
  readonly items?: JsonSchema;
  readonly minItems?: number;
  readonly minLength?: number;
  readonly enum?: readonly unknown[];
  readonly const?: unknown;
  readonly anyOf?: readonly JsonSchema[];
};

/** The smallest value the documented schema accepts, built only from the document. */
function documentedExample(schema: JsonSchema): unknown {
  if (schema.const !== undefined) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (schema.anyOf) return documentedExample(schema.anyOf[0]!);
  switch (schema.type) {
    case "string":
      return "x".repeat(Math.max(1, schema.minLength ?? 1));
    case "integer":
    case "number":
      return 0;
    case "array":
      return Array.from({ length: schema.minItems ?? 0 }, () => documentedExample(schema.items!));
    case "object":
      return Object.fromEntries(
        (schema.required ?? []).map((key) => [key, documentedExample(schema.properties![key]!)]),
      );
    default:
      throw new Error(`Unsupported documented schema type: ${schema.type}`);
  }
}

const schemas = futrobOpenApiV1.components.schemas as unknown as Record<string, JsonSchema>;
const documentedCommands = Object.entries(futrobOpenApiV1.paths).flatMap(([path, item]) => {
  if (!path.includes("/official-selection/")) return [];
  const post = (
    item as { post?: { requestBody: { content: Record<string, { schema: { $ref: string } }> } } }
  ).post;
  if (!post) return [];
  const ref = post.requestBody.content["application/json"]!.schema.$ref;
  return [{ path, schema: schemas[ref.replace("#/components/schemas/", "")]! }];
});

function concrete(path: string) {
  return `/api/v1${path
    .replace("{organizationId}", "org-unknown")
    .replace("{encounterId}", "enc-unknown")
    .replace("{proposalId}", "proposal-unknown")}`;
}

describe("documented Team official-selection operations", () => {
  it("documents the five Team commands", () => {
    expect(documentedCommands.map(({ path }) => path.split("/official-selection")[1])).toEqual([
      "/proposals",
      "/proposals/{proposalId}/confirm",
      "/proposals/{proposalId}/reject",
      "/proposals/{proposalId}/alternative",
      "/disputes",
    ]);
  });

  it.each(documentedCommands)(
    "$path accepts the documented body and rejects it without any required field",
    async ({ path, schema }) => {
      const app = buildApp(stubFetch);
      const post = (body: unknown) =>
        app.request(concrete(path), {
          method: "POST",
          headers: serviceHeaders("actor-unknown"),
          body: JSON.stringify(body),
        });
      const body = documentedExample(schema) as Record<string, unknown>;

      // A valid body reaches the use case, which reports the unknown Encounter.
      const accepted = await post(body);
      expect(accepted.status).toBe(404);
      expect(apiErrorSchema.parse(await accepted.json()).code).toMatch(
        /^results\.(encounter|selection)_not_found$/,
      );

      for (const key of schema.required ?? []) {
        const { [key]: _omitted, ...incomplete } = body;
        const rejected = await post(incomplete);
        expect(rejected.status).toBe(400);
        expect(apiErrorSchema.parse(await rejected.json())).toMatchObject({
          code: "api.validation_error",
        });
      }
    },
  );

  it("reads only with the documented actingTeamId query", async () => {
    const app = buildApp(stubFetch);
    const path = concrete(
      "/organizations/{organizationId}/encounters/{encounterId}/official-selection",
    );
    const read = (query: string) =>
      app.request(`${path}${query}`, { headers: serviceHeaders("actor-unknown") });

    const withTeam = await read("?actingTeamId=team-x");
    expect(withTeam.status).toBe(404);
    expect(apiErrorSchema.parse(await withTeam.json())).toMatchObject({
      code: "results.encounter_not_found",
    });
    const withoutTeam = await read("");
    expect(withoutTeam.status).toBe(400);
    expect(apiErrorSchema.parse(await withoutTeam.json())).toMatchObject({
      code: "api.validation_error",
    });
  });

  it("requires service authentication before any selection command", async () => {
    const app = buildApp(stubFetch);
    const response = await app.request(concrete(documentedCommands[0]!.path), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Futrob-Actor-Id": "actor-unknown" },
      body: JSON.stringify(documentedExample(documentedCommands[0]!.schema)),
    });
    expect(response.status).toBe(401);
    expect(apiErrorSchema.parse(await response.json())).toMatchObject({ code: "api.unauthorized" });
  });
});
