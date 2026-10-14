import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";
import { apiErrorSchema } from "../errors.ts";
import { pingResponseSchema } from "../meta/ping.response.ts";
import {
  encounterScheduleSnapshotSchema,
  listEncounterCandidatesResponseSchema,
} from "../encounters/schemas.ts";
import { scheduleChangeRequestSchema } from "../encounters/schemas.ts";
import { providerSyncJobResponseSchema } from "../game-data/schemas.ts";
import {
  officialSelectionCommandResponseSchema,
  officialSelectionViewSchema,
  proposeOfficialSelectionRequestSchema,
} from "../results/schemas.ts";
import { getCompetitionStandingsResponseSchema } from "../statistics/schemas.ts";
import { futrobOpenApiV1 } from "./document.ts";
import { assertRequiredAndEnumParity, requiredAndEnumParity } from "./zod-schema-parity.ts";

const schemas = futrobOpenApiV1.components.schemas;

describe("Zod and OpenAPI required/enum parity", () => {
  it("matches on critical component schemas", () => {
    const cases = [
      ["ApiError", apiErrorSchema, "output"],
      ["PingResponse", pingResponseSchema, "output"],
      ["ListEncounterCandidatesResponse", listEncounterCandidatesResponseSchema, "output"],
      ["EncounterScheduleSnapshot", encounterScheduleSnapshotSchema, "output"],
      ["GetCompetitionStandingsResponse", getCompetitionStandingsResponseSchema, "output"],
      ["OfficialSelectionView", officialSelectionViewSchema, "output"],
      ["OfficialSelectionCommandResponse", officialSelectionCommandResponseSchema, "output"],
      ["ProposeOfficialSelectionRequest", proposeOfficialSelectionRequestSchema, "input"],
      ["ScheduleChangeRequest", scheduleChangeRequestSchema, "output"],
      ["ProviderSyncJobResponse", providerSyncJobResponseSchema, "output"],
    ] as const;

    for (const [name, schema, io] of cases) {
      expect(Object.hasOwn(schemas, name), name).toBe(true);
      assertRequiredAndEnumParity(
        schema,
        z.json().parse(JSON.parse(JSON.stringify(schemas[name]))),
        io,
      );
    }
  });

  it("fails parity when Zod adds a required field the spec does not list", () => {
    const spec = z.json().parse({
      type: "object",
      required: ["code"],
      properties: { code: { type: "string" } },
    });
    const extra = z.object({ code: z.string(), extra: z.string() });
    const parity = requiredAndEnumParity(extra, spec, "output");
    expect(parity.zodRequired).toContain("extra");
    expect(parity.specRequired).not.toContain("extra");
    expect(() => assertRequiredAndEnumParity(extra, spec, "output")).toThrow(/required mismatch/);
  });
});
