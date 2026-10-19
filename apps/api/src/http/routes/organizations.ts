import type { Hono } from "hono";
import {
  listOrganizationMembersResponseSchema,
  acceptInvitationResponseSchema,
  createInvitationResponseSchema,
  createOrganizationResponseSchema,
  listMyMembershipsResponseSchema,
  organizationNameAvailabilityResponseSchema,
  organizationProfileSchema,
  organizationSlugAvailabilityResponseSchema,
  resolvePostAuthDestinationResponseSchema,
} from "@futrob/api-contracts";
import { resolvePostAuthDestination } from "@futrob/organizations";
import { asOrganizationId } from "@futrob/shared-kernel";
import type { AppDeps } from "@/app.ts";
import { failureToHttp } from "@/http/errors.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  acceptOrganizationInvitationRoute,
  checkOrganizationNameAvailabilityRoute,
  checkOrganizationSlugAvailabilityRoute,
  createOrganizationInvitationRoute,
  createOrganizationRoute,
  getOrganizationProfileRoute,
  listOrganizationMembersRoute,
  listMyOrganizationsRoute,
  resolvePostAuthDestinationRoute,
  setOrganizationLogoRoute,
  updateOrganizationProfileRoute,
} from "@/http/openapi/routes/organizations.ts";
import { jsonResponse } from "@/utils/http-response.ts";
import { membershipDto, organizationProfileDto } from "./organization-dto.ts";

export function registerOrganizationRoutes(app: Hono, deps: AppDeps): void {
  const { identity, organizations } = deps.modules;
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  secured.openapi(checkOrganizationNameAvailabilityRoute, async (c) => {
    return jsonResponse(
      organizationNameAvailabilityResponseSchema.parse(
        await organizations.checkOrganizationName.execute(c.req.valid("json")),
      ),
    );
  });

  secured.openapi(listMyOrganizationsRoute, async (c) => {
    const actorId = c.get("actorId");
    const memberships = await organizations.listMembershipsForActor.execute({ actorId });
    const body = listMyMembershipsResponseSchema.parse({
      memberships: memberships.map(membershipDto),
    });
    return jsonResponse(body);
  });

  secured.openapi(resolvePostAuthDestinationRoute, async (c) => {
    const actorId = c.get("actorId");
    const onboarding = await identity.getOnboardingStatus.execute({ actorId });
    const memberships = onboarding.completed
      ? await organizations.listMembershipsForActor.execute({ actorId })
      : [];
    const destination = resolvePostAuthDestination(memberships, onboarding.completed);
    const body = resolvePostAuthDestinationResponseSchema.parse({
      destination:
        destination.kind === "organizationPicker"
          ? {
              kind: destination.kind,
              memberships: destination.memberships.map(membershipDto),
            }
          : destination.kind === "organization"
            ? {
                kind: destination.kind,
                organizationId: destination.organizationId,
              }
            : { kind: destination.kind },
      memberships: memberships.map(membershipDto),
    });
    return jsonResponse(body);
  });

  secured.openapi(createOrganizationRoute, async (c) => {
    const actorId = c.get("actorId");
    const body = c.req.valid("json");

    const result = await organizations.createOrganization.execute({
      name: body.name,
      actorId,
      timeZone: body.timeZone,
      slug: body.slug,
      // Namespaced so a client can never replay another actor's key (e.g. onboarding's).
      creationKey: body.creationKey ? `organization:${actorId}:${body.creationKey}` : undefined,
    });
    if (!result.isOk()) {
      return failureToHttp(result.error);
    }

    return jsonResponse(
      createOrganizationResponseSchema.parse({
        ...organizationProfileDto(result.value.organization),
        role: result.value.role,
      }),
      201,
    );
  });

  secured.openapi(checkOrganizationSlugAvailabilityRoute, async (c) => {
    const body = c.req.valid("json");
    return jsonResponse(
      organizationSlugAvailabilityResponseSchema.parse(
        await organizations.checkOrganizationSlug.execute({
          slug: body.slug,
          organizationId: body.organizationId ? asOrganizationId(body.organizationId) : undefined,
        }),
      ),
    );
  });

  secured.openapi(listOrganizationMembersRoute, async (c) => {
    const result = await organizations.listOrganizationMembers.execute({
      organizationId: asOrganizationId(c.req.valid("param").organizationId),
      actorId: c.get("actorId"),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      listOrganizationMembersResponseSchema.parse({
        members: result.value.members.map((member) => ({
          ...member,
          joinedAt: member.joinedAt.toISOString(),
          access:
            member.access.kind === "assigned" || member.access.kind === "inherited-with-restriction"
              ? {
                  kind: member.access.kind,
                  competitions: member.access.competitions.map(
                    ({ competitionId, ...assignment }) => ({ id: competitionId, ...assignment }),
                  ),
                }
              : member.access,
        })),
      }),
    );
  });

  secured.openapi(getOrganizationProfileRoute, async (c) => {
    const result = await organizations.getOrganizationProfile.execute({
      organizationId: asOrganizationId(c.req.valid("param").organizationId),
      actorId: c.get("actorId"),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(organizationProfileSchema.parse(organizationProfileDto(result.value)));
  });

  secured.openapi(updateOrganizationProfileRoute, async (c) => {
    const result = await organizations.updateOrganizationProfile.execute({
      organizationId: asOrganizationId(c.req.valid("param").organizationId),
      actorId: c.get("actorId"),
      ...c.req.valid("json"),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(organizationProfileSchema.parse(organizationProfileDto(result.value)));
  });

  secured.openapi(setOrganizationLogoRoute, async (c) => {
    const result = await organizations.setOrganizationLogo.execute({
      organizationId: asOrganizationId(c.req.valid("param").organizationId),
      actorId: c.get("actorId"),
      logo: c.req.valid("json").logo,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(organizationProfileSchema.parse(organizationProfileDto(result.value)));
  });

  secured.openapi(createOrganizationInvitationRoute, async (c) => {
    const actorId = c.get("actorId");
    const body = c.req.valid("json");

    const result = await organizations.createInvitation.execute({
      organizationId: asOrganizationId(c.req.valid("param").organizationId),
      role: body.role,
      invitedByActorId: actorId,
      email: body.email,
      expiresInMs: body.expiresInMs,
      redeemPolicy: body.redeemPolicy,
      maxRedemptions: body.maxRedemptions,
    });
    if (!result.isOk()) {
      return failureToHttp(result.error);
    }

    return jsonResponse(
      createInvitationResponseSchema.parse({
        invitationId: result.value.invitationId,
        competitionId: null,
        token: result.value.token,
        expiresAt: result.value.expiresAt.toISOString(),
        redeemPolicy: result.value.redeemPolicy,
        maxRedemptions: result.value.maxRedemptions,
      }),
      201,
    );
  });

  secured.openapi(acceptOrganizationInvitationRoute, async (c) => {
    const actorId = c.get("actorId");
    const body = c.req.valid("json");

    const result = await organizations.acceptInvitation.execute({
      token: body.token,
      actorId,
    });
    if (!result.isOk()) {
      return failureToHttp(result.error);
    }

    return jsonResponse(
      acceptInvitationResponseSchema.parse({
        organizationId: result.value.organizationId,
        organizationName: result.value.organizationName,
        role: result.value.role,
        competitionId: result.value.competitionId,
        competitionRole: result.value.competitionRole,
      }),
    );
  });

  app.route("/", secured);
}
