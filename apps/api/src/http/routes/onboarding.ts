import { Hono } from "hono";
import {
  completeInvitationOnboardingRequestSchema,
  completeInvitationOnboardingResponseSchema,
  inspectCompetitionInvitationRequestSchema,
  inspectCompetitionInvitationResponseSchema,
  completeOrganizationOnboardingRequestSchema,
  completeOrganizationOnboardingResponseSchema,
  completePlayerOnboardingRequestSchema,
  completePlayerOnboardingResponseSchema,
  getOnboardingStatusResponseSchema,
  saveOnboardingProgressRequestSchema,
  saveOnboardingProgressResponseSchema,
  type OnboardingPathDto,
  type PlayerGameAccountInputDto,
} from "@futrob/api-contracts";
import { CompetitionNotFound } from "@futrob/competitions";
import { InvitationInvalid } from "@futrob/organizations";
import type { ExternalClub } from "@futrob/game-data";
import type {
  AddPlayerGameAccountError,
  PlayerExternalClubAssociation,
  PlayerGameAccount,
  PlayerProfile,
} from "@futrob/teams";
import type { AppDeps } from "@/app.ts";
import {
  apiErrorResponse,
  failureToHttp,
  isHttpMappableFailure,
  validationErrorResponse,
} from "@/http/errors.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import {
  playerExternalClubAssociationDto,
  playerGameAccountDto,
  playerProfileDto,
} from "@/http/mappers/player.ts";
import { competitionDraftDto } from "@/http/mappers/competition.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerOnboardingRoutes(app: Hono, deps: AppDeps): void {
  const { competitions, gameData, identity, organizations, teams, transaction } = deps.modules;
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));

  secured.get("/identity/onboarding", async (c) => {
    const status = await identity.getOnboardingStatus.execute({ actorId: c.get("actorId") });
    return jsonResponse(
      getOnboardingStatusResponseSchema.parse({
        ...status,
        completedAt: status.completedAt?.toISOString() ?? null,
      }),
    );
  });

  secured.patch("/identity/onboarding", async (c) => {
    const json: unknown = await c.req.json().catch(() => null);
    const parsed = saveOnboardingProgressRequestSchema.safeParse(json);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const status = await identity.saveOnboardingProgress.execute({
      actorId: c.get("actorId"),
      path: parsed.data.path,
      currentStep: parsed.data.currentStep,
    });
    return jsonResponse(
      saveOnboardingProgressResponseSchema.parse({
        ...status,
        completedAt: status.completedAt?.toISOString() ?? null,
      }),
    );
  });

  secured.post("/identity/onboarding/organization", async (c) => {
    const json: unknown = await c.req.json().catch(() => null);
    const parsed = completeOrganizationOnboardingRequestSchema.safeParse(json);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const actorId = c.get("actorId");
    const conflict = await onboardingPathConflict(identity, actorId, "organization");
    if (conflict) return conflict;

    try {
      const body = await transaction.runInTransaction(async () => {
        const result = await organizations.createOrganization.execute({
          name: parsed.data.name,
          actorId,
          creationKey: `onboarding:organization:${actorId}`,
        });
        if (!result.isOk()) throw result.error;

        const competition = await competitions.createDraft.execute({
          organizationId: result.value.organization.id,
          actorId,
          ...parsed.data.competition,
          creationKey: `onboarding:competition:${actorId}`,
        });
        if (!competition.isOk()) throw competition.error;

        const player = await ensurePlayer(teams, actorId, parsed.data.gameAccount ?? null);
        if (!player.ok) throw player.error;

        await identity.completeOnboarding.execute({ actorId, path: "organization" });
        return completeOrganizationOnboardingResponseSchema.parse({
          organizationId: result.value.organization.id,
          name: result.value.organization.name,
          role: result.value.role,
          competition: competitionDraftDto(competition.value),
          profile: playerProfileDto(player.profile),
          gameAccount: player.gameAccount ? playerGameAccountDto(player.gameAccount) : null,
          destination: {
            kind: "competition-setup",
            organizationId: result.value.organization.id,
            competitionId: competition.value.competition.id,
          },
        });
      });
      return jsonResponse(body);
    } catch (error) {
      if (isHttpMappableFailure(error)) return failureToHttp(error);
      throw error;
    }
  });

  secured.post("/identity/onboarding/invitation", async (c) => {
    const json: unknown = await c.req.json().catch(() => null);
    const parsed = completeInvitationOnboardingRequestSchema.safeParse(json);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const actorId = c.get("actorId");
    const conflict = await onboardingPathConflict(identity, actorId, "invitation");
    if (conflict) return conflict;

    try {
      const body = await transaction.runInTransaction(async () => {
        const result = await organizations.acceptInvitation.execute({
          token: parsed.data.token,
          actorId,
          requireCompetition: true,
        });
        if (!result.isOk()) throw result.error;

        const competitionId = result.value.competitionId!;
        const competition = await competitions.getDraft.execute({
          organizationId: result.value.organizationId,
          competitionId,
        });
        if (!competition) {
          throw new CompetitionNotFound({
            code: "competitions.not_found",
            message: "Competition not found",
          });
        }
        const joined = await competitions.join.execute({
          organizationId: result.value.organizationId,
          competitionId,
          actorId,
          role: result.value.competitionRole!,
        });
        if (!joined.isOk()) throw joined.error;

        const player = await ensurePlayer(teams, actorId, parsed.data.gameAccount ?? null);
        if (!player.ok) throw player.error;

        await identity.completeOnboarding.execute({ actorId, path: "invitation" });
        return completeInvitationOnboardingResponseSchema.parse({
          organizationId: result.value.organizationId,
          organizationName: result.value.organizationName,
          role: result.value.role,
          competitionRole: result.value.competitionRole,
          competitionId,
          competitionName: competition.competition.name,
          profile: playerProfileDto(player.profile),
          gameAccount: player.gameAccount ? playerGameAccountDto(player.gameAccount) : null,
          destination: {
            kind: "competition",
            organizationId: result.value.organizationId,
            competitionId,
          },
        });
      });
      return jsonResponse(body);
    } catch (error) {
      if (isHttpMappableFailure(error)) return failureToHttp(error);
      throw error;
    }
  });

  secured.post("/identity/onboarding/invitation/preview", async (c) => {
    const json: unknown = await c.req.json().catch(() => null);
    const parsed = inspectCompetitionInvitationRequestSchema.safeParse(json);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const inspected = await organizations.inspectCompetitionInvitation.execute({
      token: parsed.data.token,
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

  secured.post("/identity/onboarding/player", async (c) => {
    const json: unknown = await c.req.json().catch(() => null);
    const parsed = completePlayerOnboardingRequestSchema.safeParse(json);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const actorId = c.get("actorId");
    const conflict = await onboardingPathConflict(identity, actorId, "player");
    if (conflict) return conflict;

    const locator = parsed.data.externalClub ?? null;
    let resolvedClub: ExternalClub | null = null;
    if (locator) {
      const resolved = await gameData.getExternalClub.execute(locator.providerKey, {
        externalClubId: locator.externalClubId,
        platform: locator.platform,
        gameEdition: locator.gameEdition,
      });
      if (!resolved.isOk()) return failureToHttp(resolved.error);
      resolvedClub = resolved.value;
    }

    try {
      const body = await transaction.runInTransaction(async () => {
        const player = await ensurePlayer(teams, actorId, parsed.data.gameAccount ?? null);
        if (!player.ok) throw player.error;

        let externalClub: PlayerExternalClubAssociation | null = null;
        if (resolvedClub) {
          const associated = await teams.associatePlayerExternalClub.execute({
            playerProfileId: player.profile.id,
            club: resolvedClub,
          });
          if (!associated.isOk()) throw associated.error;
          externalClub = associated.value;
        }

        await identity.completeOnboarding.execute({ actorId, path: "player" });
        return completePlayerOnboardingResponseSchema.parse({
          profile: playerProfileDto(player.profile),
          gameAccount: player.gameAccount ? playerGameAccountDto(player.gameAccount) : null,
          externalClub: externalClub ? playerExternalClubAssociationDto(externalClub) : null,
          destination: "personal",
        });
      });
      return jsonResponse(body);
    } catch (error) {
      if (isHttpMappableFailure(error)) return failureToHttp(error);
      throw error;
    }
  });

  app.route("/", secured);
}

type EnsurePlayerResult =
  | {
      readonly ok: true;
      readonly profile: PlayerProfile;
      readonly gameAccount: PlayerGameAccount | null;
    }
  | {
      readonly ok: false;
      readonly error: AddPlayerGameAccountError;
    };

async function ensurePlayer(
  teams: AppDeps["modules"]["teams"],
  actorId: ServiceAuthVariables["actorId"],
  gameAccountInput: PlayerGameAccountInputDto | null,
): Promise<EnsurePlayerResult> {
  const profile = await teams.ensurePlayerProfile.execute({ actorId });
  if (!gameAccountInput) return { ok: true, profile, gameAccount: null };
  const added = await teams.addPlayerGameAccount.execute({
    playerProfileId: profile.id,
    ...gameAccountInput,
  });
  return added.isOk()
    ? { ok: true, profile, gameAccount: added.value }
    : { ok: false, error: added.error };
}

async function onboardingPathConflict(
  identity: AppDeps["modules"]["identity"],
  actorId: ServiceAuthVariables["actorId"],
  requestedPath: OnboardingPathDto,
): Promise<Response | null> {
  const status = await identity.getOnboardingStatus.execute({ actorId });
  if (!status.completed || status.path === requestedPath) return null;

  return apiErrorResponse(409, {
    code: "identity.onboarding_path_conflict",
    messageKey: "errors.identity.onboarding_path_conflict",
    details: { completedPath: status.path ?? undefined, requestedPath },
  });
}
