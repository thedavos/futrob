import { defineRoute } from "@/http/openapi/define-route.ts";
import { pathParams } from "@/http/openapi/path-params.ts";
import {
  EditFixtureEncounterRequest,
  FixturePlan,
  GenerateCompetitionFixtureRequest,
  GetCurrentCompetitionFixtureResponse,
} from "@/http/openapi/components.ts";

export const generateCompetitionFixtureRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/competitions/{competitionId}/fixture",
  operationId: "generateCompetitionFixture",
  tags: ["fixtures"],
  summary: "Generate or replay a deterministic competition fixture",
  params: pathParams(["organizationId", "competitionId"]),
  body: GenerateCompetitionFixtureRequest,
  success: {
    status: 200,
    description: "Generated fixture or existing fixture for the same generation version",
    schema: FixturePlan,
  },
  errors: [400, 401, 403, 409],
});

export const getCurrentCompetitionFixtureRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/competitions/{competitionId}/fixture",
  operationId: "getCurrentCompetitionFixture",
  tags: ["fixtures"],
  summary: "Get the competition's current fixture with the names of its Teams",
  params: pathParams(["organizationId", "competitionId"]),
  success: {
    status: 200,
    description: "Current fixture, or null before one is generated",
    schema: GetCurrentCompetitionFixtureResponse,
  },
  errors: [401, 404],
});

export const getCompetitionFixtureRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/competitions/{competitionId}/fixtures/{fixturePlanId}",
  operationId: "getCompetitionFixture",
  tags: ["fixtures"],
  summary: "Get an organization-scoped competition fixture",
  params: pathParams(["organizationId", "competitionId", "fixturePlanId"]),
  success: { status: 200, description: "Competition fixture", schema: FixturePlan },
  errors: [401, 404],
});

export const editFixtureEncounterRoute = defineRoute({
  method: "patch",
  path: "/organizations/{organizationId}/competitions/{competitionId}/fixtures/{fixturePlanId}/encounters/{encounterId}",
  operationId: "editFixtureEncounter",
  tags: ["fixtures"],
  summary: "Edit an unresolved fixture encounter with audit history",
  params: pathParams(["organizationId", "competitionId", "fixturePlanId", "encounterId"]),
  body: EditFixtureEncounterRequest,
  success: { status: 200, description: "Updated competition fixture", schema: FixturePlan },
  errors: [400, 401, 403, 404, 409],
});
