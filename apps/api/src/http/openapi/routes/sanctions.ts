import { defineRoute } from "@/http/openapi/define-route.ts";
import { pathParams } from "@/http/openapi/path-params.ts";
import {
  CompetitionSanction,
  ImposeSanctionRequest,
  ListCompetitionSanctionsResponse,
  RevokeSanctionRequest,
} from "@/http/openapi/components.ts";

const SANCTIONS = "/organizations/{organizationId}/competitions/{competitionId}/sanctions";
const scopeParams = ["organizationId", "competitionId"] as const;

const COMMAND_FAILURES =
  "400 `api.validation_error`, `competitions.invalid_sanction`; 403 `authorization.forbidden`; " +
  "404 `competitions.not_found`; 409 `competitions.sanctions_closed`";

export const listCompetitionSanctionsRoute = defineRoute({
  method: "get",
  path: SANCTIONS,
  operationId: "listCompetitionSanctions",
  tags: ["competitions"],
  summary: "List every sanction of a competition, revoked included",
  description:
    "Requires `competitions.sanctions.read` (organizer and staff). Newest first. Each sanction " +
    "keeps who imposed it, the reason, when and the request correlation (ADR-0028).",
  params: pathParams(scopeParams),
  success: { status: 200, description: "Sanctions", schema: ListCompetitionSanctionsResponse },
  errors: [401, 403, 404],
});

export const imposeSanctionRoute = defineRoute({
  method: "post",
  path: SANCTIONS,
  operationId: "imposeSanction",
  tags: ["competitions"],
  summary: "Sanction a Team entered in the competition, or one of its players",
  description:
    "Requires `competitions.sanctions.manage` and a competition in registration, published, " +
    "paused or finished. `points_deduction` needs `pointsDeducted` (1–100) and rebuilds the " +
    "table in the same transaction; `match_suspension` needs `suspensionMatches` (1–20); " +
    "`administrative_defeat` needs the Team's `encounterId` and creates no official result. " +
    `Failures: ${COMMAND_FAILURES}; 404 \`competitions.sanction_target_not_found\`.`,
  params: pathParams(scopeParams),
  body: ImposeSanctionRequest,
  success: { status: 201, description: "Sanction imposed", schema: CompetitionSanction },
  errors: [400, 401, 403, 404, 409],
});

export const revokeSanctionRoute = defineRoute({
  method: "post",
  path: `${SANCTIONS}/{sanctionId}/revoke`,
  operationId: "revokeSanction",
  tags: ["competitions"],
  summary: "Revoke an active sanction",
  description:
    "Requires `competitions.sanctions.manage`. The sanction is never deleted: the revocation " +
    "records actor, reason, date and request correlation once. A revoked deduction rebuilds " +
    `the table. Failures: ${COMMAND_FAILURES}; 404 \`competitions.sanction_not_found\`; ` +
    "409 `competitions.sanction_already_revoked`.",
  params: pathParams([...scopeParams, "sanctionId"]),
  body: RevokeSanctionRequest,
  success: { status: 200, description: "Sanction revoked", schema: CompetitionSanction },
  errors: [400, 401, 403, 404, 409],
});

export const listTeamSanctionsRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/competitions/{competitionId}/teams/{teamId}/sanctions",
  operationId: "listTeamSanctions",
  tags: ["competitions"],
  summary: "List the sanctions on a Team and on its players",
  description:
    "Read-only view for the affected Team. Requires `teams.read` on that Team in this " +
    "competition: its roster and the competition operators pass; other Teams get 403.",
  params: pathParams([...scopeParams, "teamId"]),
  success: { status: 200, description: "Sanctions", schema: ListCompetitionSanctionsResponse },
  errors: [401, 403],
});
