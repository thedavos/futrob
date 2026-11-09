import { defineRoute } from "@/http/openapi/define-route.ts";
import { pathParams } from "@/http/openapi/path-params.ts";
import {
  CloseSwissRoundRequest,
  WithdrawSwissTeamRequest,
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

export const withdrawSwissTeamRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/competitions/{competitionId}/fixtures/{fixturePlanId}/swiss/withdrawals",
  operationId: "withdrawSwissTeam",
  tags: ["fixtures"],
  summary: "Withdraw a Team from the later rounds of a Swiss fixture",
  description:
    "Requires encounters.schedule.manage. The Team keeps its approved results and stays in the table, marked as withdrawn. Its unplayed encounter becomes a bye for the rival, or is removed if the rival is gone too or the Team was the one resting; an open selection on it is voided. An approved result is never touched. Repeating `requestId` returns the fixture without applying anything. Failures carry a stable `code`: 400 `api.validation_error`, `scheduling.invalid_fixture_configuration`, `scheduling.swiss_team_not_participant`; 403 `authorization.forbidden`; 404 `scheduling.fixture_plan_not_found`; 409 `scheduling.not_swiss_fixture`, `scheduling.swiss_team_already_withdrawn`, `scheduling.fixture_update_conflict`.",
  params: pathParams(["organizationId", "competitionId", "fixturePlanId"]),
  body: WithdrawSwissTeamRequest,
  success: { status: 200, description: "Updated competition fixture", schema: FixturePlan },
  errors: [400, 401, 403, 404, 409],
});

export const closeSwissRoundRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/competitions/{competitionId}/fixtures/{fixturePlanId}/swiss/rounds/{roundNumber}/close",
  operationId: "closeSwissRound",
  tags: ["fixtures"],
  summary: "Close the unplayed encounters of the current Swiss round",
  description:
    "Requires encounters.schedule.manage. Each unplayed encounter becomes Team vs Team with `series: null` and `closedWithoutResult: true`: nobody scores, no official result is created and the pair counts as already met. Open selections on them are voided. The next round is paired in the same request. Repeating `requestId` returns the fixture without applying anything. Failures carry a stable `code`: 400 `api.validation_error`, `scheduling.invalid_fixture_configuration`; 403 `authorization.forbidden`; 404 `scheduling.fixture_plan_not_found`; 409 `scheduling.not_swiss_fixture`, `scheduling.swiss_round_not_current`, `scheduling.fixture_update_conflict`.",
  params: pathParams(["organizationId", "competitionId", "fixturePlanId", "roundNumber"]),
  body: CloseSwissRoundRequest,
  success: { status: 200, description: "Updated competition fixture", schema: FixturePlan },
  errors: [400, 401, 403, 404, 409],
});
