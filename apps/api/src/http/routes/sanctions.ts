import {
  competitionSanctionSchema,
  listCompetitionSanctionsResponseSchema,
  type CompetitionSanctionDto,
} from "@futrob/api-contracts";
import type { CompetitionSanction } from "@futrob/competitions";
import {
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type OrganizationId,
  type TeamId,
} from "@futrob/shared-kernel";
import type { Context, Hono } from "hono";
import type { AppDeps } from "@/app.ts";
import { currentRequestCorrelation } from "@/context/request-correlation.ts";
import { failureToHttp } from "@/http/errors.ts";
import type { ServiceAuthVariables } from "@/http/middleware/service-auth.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  imposeSanctionRoute,
  listCompetitionSanctionsRoute,
  listTeamSanctionsRoute,
  revokeSanctionRoute,
} from "@/http/openapi/routes/sanctions.ts";
import { jsonResponse } from "@/utils/http-response.ts";

type SecuredContext = Context<{ Variables: ServiceAuthVariables }>;

/**
 * Competition sanctions (ADR-0028). Organizer and staff list, impose and revoke under the
 * competition; the affected Team reads its own under `/teams/{teamId}/sanctions`. There is
 * no edit or delete route: a sanction is revoked, never removed.
 */
export function registerSanctionRoutes(app: Hono, deps: AppDeps): void {
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);
  const { sanctions, teams } = deps.modules;

  function scope(c: SecuredContext, params: Record<string, string>) {
    return {
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(params.organizationId ?? ""),
      competitionId: asCompetitionId(params.competitionId ?? ""),
    };
  }

  function requestId(): string {
    return currentRequestCorrelation()?.requestId ?? crypto.randomUUID();
  }

  /** Names for display, read once per Team and per player of the list. */
  async function toDtos(
    organizationId: OrganizationId,
    rows: readonly CompetitionSanction[],
  ): Promise<CompetitionSanctionDto[]> {
    const teamNames = new Map<TeamId, Promise<string | null>>();
    const playerNames = new Map<string, Promise<string | null>>();
    const teamName = (teamId: TeamId) => {
      const cached =
        teamNames.get(teamId) ??
        teams.repositories.teams
          .findById(organizationId, teamId)
          .then((team) => team?.name ?? null);
      teamNames.set(teamId, cached);
      return cached;
    };
    const playerName = (profileId: string) => {
      const cached =
        playerNames.get(profileId) ??
        teams.repositories.accounts
          .listByProfile(profileId)
          .then((accounts) => accounts[0]?.identifier ?? null);
      playerNames.set(profileId, cached);
      return cached;
    };
    return Promise.all(
      rows.map(async (sanction) =>
        competitionSanctionSchema.parse({
          id: sanction.id,
          competitionId: sanction.competitionId,
          targetType: sanction.targetType,
          teamId: sanction.teamId,
          teamName: await teamName(sanction.teamId),
          playerProfileId: sanction.playerProfileId,
          playerName: sanction.playerProfileId ? await playerName(sanction.playerProfileId) : null,
          type: sanction.type,
          pointsDeducted: sanction.pointsDeducted,
          suspensionMatches: sanction.suspensionMatches,
          encounterId: sanction.encounterId,
          reason: sanction.reason,
          imposedByActorId: sanction.imposedByActorId,
          imposedAt: sanction.imposedAt.toISOString(),
          requestId: sanction.requestId,
          revocation: sanction.revocation
            ? {
                actorId: sanction.revocation.actorId,
                revokedAt: sanction.revocation.at.toISOString(),
                reason: sanction.revocation.reason,
                requestId: sanction.revocation.requestId,
              }
            : null,
        }),
      ),
    );
  }

  secured.openapi(listCompetitionSanctionsRoute, async (c) => {
    const input = scope(c, c.req.valid("param"));
    const result = await sanctions.listByCompetition.execute(input);
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      listCompetitionSanctionsResponseSchema.parse({
        sanctions: await toDtos(input.organizationId, result.value),
      }),
    );
  });

  secured.openapi(imposeSanctionRoute, async (c) => {
    const input = scope(c, c.req.valid("param"));
    const body = c.req.valid("json");
    const result = await sanctions.commands.impose.execute({
      ...input,
      target:
        body.target.type === "team"
          ? { type: "team", teamId: asTeamId(body.target.teamId) }
          : { type: "player", playerProfileId: body.target.playerProfileId },
      type: body.type,
      reason: body.reason,
      pointsDeducted: body.pointsDeducted,
      suspensionMatches: body.suspensionMatches,
      encounterId: body.encounterId,
      requestId: requestId(),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    const [dto] = await toDtos(input.organizationId, [result.value]);
    return jsonResponse(dto, 201);
  });

  secured.openapi(revokeSanctionRoute, async (c) => {
    const params = c.req.valid("param");
    const input = scope(c, params);
    const result = await sanctions.commands.revoke.execute({
      ...input,
      sanctionId: params.sanctionId ?? "",
      reason: c.req.valid("json").reason,
      requestId: requestId(),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    const [dto] = await toDtos(input.organizationId, [result.value]);
    return jsonResponse(dto);
  });

  secured.openapi(listTeamSanctionsRoute, async (c) => {
    const params = c.req.valid("param");
    const input = scope(c, params);
    const result = await sanctions.listByTeam.execute({
      ...input,
      teamId: asTeamId(params.teamId ?? ""),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      listCompetitionSanctionsResponseSchema.parse({
        sanctions: await toDtos(input.organizationId, result.value),
      }),
    );
  });

  app.route("/", secured);
}
