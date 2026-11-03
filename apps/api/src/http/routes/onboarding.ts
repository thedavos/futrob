import type { Hono } from "hono";
import {
  completeInvitationOnboardingResponseSchema,
  inspectCompetitionInvitationResponseSchema,
  completeOrganizationOnboardingResponseSchema,
  completePlayerOnboardingResponseSchema,
  getOnboardingStatusResponseSchema,
  saveOnboardingProgressResponseSchema,
} from "@futrob/api-contracts";
import { InvitationInvalid } from "@futrob/organizations";
import { organizationProfileDto } from "./organization-dto.ts";
import type { AppDeps } from "@/app.ts";
import { failureToHttp } from "@/http/errors.ts";
import {
  playerExternalClubAssociationDto,
  playerGameAccountDto,
  playerProfileDto,
} from "@/http/mappers/player.ts";
import { competitionDraftDto } from "@/http/mappers/competition.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  completeInvitationOnboardingRoute,
  completeOrganizationOnboardingRoute,
  completePlayerOnboardingRoute,
  getOnboardingStatusRoute,
  inspectCompetitionInvitationRoute,
  saveOnboardingProgressRoute,
} from "@/http/openapi/routes/identity.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerOnboardingRoutes(app: Hono, deps: AppDeps): void {
  const { competitions, identity, onboardingCompletion, organizations } = deps.modules;
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  secured.openapi(getOnboardingStatusRoute, async (c) => {
    const status = await identity.getOnboardingStatus.execute({ actorId: c.get("actorId") });
    return jsonResponse(
      getOnboardingStatusResponseSchema.parse({
        ...status,
        completedAt: status.completedAt?.toISOString() ?? null,
      }),
    );
  });

  secured.openapi(saveOnboardingProgressRoute, async (c) => {
    const body = c.req.valid("json");
    const status = await identity.saveOnboardingProgress.execute({
      actorId: c.get("actorId"),
      path: body.path,
      currentStep: body.currentStep,
    });
    return jsonResponse(
      saveOnboardingProgressResponseSchema.parse({
        ...status,
        completedAt: status.completedAt?.toISOString() ?? null,
      }),
    );
  });

  secured.openapi(completeOrganizationOnboardingRoute, async (c) => {
    const parsed = c.req.valid("json");
    const completed = await onboardingCompletion.completeOrganization({
      actorId: c.get("actorId"),
      name: parsed.name,
      competition: parsed.competition,
      gameAccount: parsed.gameAccount ?? null,
    });
    if (!completed.isOk()) return failureToHttp(completed.error);
    const { organization, competition, profile, gameAccount } = completed.value;
    return jsonResponse(
      completeOrganizationOnboardingResponseSchema.parse({
        ...organizationProfileDto(organization.organization),
        role: organization.role,
        competition: competitionDraftDto(competition),
        profile: playerProfileDto(profile),
        gameAccount: gameAccount ? playerGameAccountDto(gameAccount) : null,
        destination: {
          kind: "competition-setup",
          organizationId: organization.organization.id,
          competitionId: competition.competition.id,
        },
      }),
    );
  });

  secured.openapi(completeInvitationOnboardingRoute, async (c) => {
    const parsed = c.req.valid("json");
    const completed = await onboardingCompletion.completeInvitation({
      actorId: c.get("actorId"),
      token: parsed.token,
      gameAccount: parsed.gameAccount ?? null,
    });
    if (!completed.isOk()) return failureToHttp(completed.error);
    const { invitation, competitionId, competitionName, profile, gameAccount } = completed.value;
    return jsonResponse(
      completeInvitationOnboardingResponseSchema.parse({
        organizationId: invitation.organizationId,
        organizationName: invitation.organizationName,
        role: invitation.role,
        competitionRole: invitation.competitionRole,
        competitionId,
        competitionName,
        profile: playerProfileDto(profile),
        gameAccount: gameAccount ? playerGameAccountDto(gameAccount) : null,
        destination: {
          kind: "competition",
          organizationId: invitation.organizationId,
          competitionId,
        },
      }),
    );
  });

  secured.openapi(inspectCompetitionInvitationRoute, async (c) => {
    const parsed = c.req.valid("json");
    const inspected = await organizations.inspectCompetitionInvitation.execute({
      token: parsed.token,
      actorId: c.get("actorId"),
    });
    if (!inspected.isOk()) return failureToHttp(inspected.error);
    const competition = await competitions.getDraft.execute({
      organizationId: inspected.value.organizationId,
      competitionId: inspected.value.competitionId,
    });
    if (!competition) {
      return failureToHttp(
        new InvitationInvalid({
          code: "organizations.invitation_invalid",
          message: "Invitation competition is unavailable",
        }),
      );
    }
    return jsonResponse(
      inspectCompetitionInvitationResponseSchema.parse({
        ...inspected.value,
        competitionName: competition.competition.name,
        expiresAt: inspected.value.expiresAt.toISOString(),
      }),
    );
  });

  secured.openapi(completePlayerOnboardingRoute, async (c) => {
    const parsed = c.req.valid("json");
    const completed = await onboardingCompletion.completePlayer({
      actorId: c.get("actorId"),
      gameAccount: parsed.gameAccount ?? null,
      externalClub: parsed.externalClub ?? null,
    });
    if (!completed.isOk()) return failureToHttp(completed.error);
    const { profile, gameAccount, externalClubs, externalClubAssociation } = completed.value;
    return jsonResponse(
      completePlayerOnboardingResponseSchema.parse({
        profile: playerProfileDto(profile),
        gameAccount: gameAccount ? playerGameAccountDto(gameAccount) : null,
        externalClubs: externalClubs.map(playerExternalClubAssociationDto),
        externalClubAssociation,
        destination: "personal",
      }),
    );
  });

  app.route("/", secured);
}
