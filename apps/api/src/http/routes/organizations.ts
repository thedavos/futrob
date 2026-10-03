import { Hono } from "hono";
import {
  acceptInvitationRequestSchema,
  acceptInvitationResponseSchema,
  createOrganizationInvitationRequestSchema,
  createInvitationResponseSchema,
  createOrganizationRequestSchema,
  createOrganizationResponseSchema,
  listMyMembershipsResponseSchema,
  organizationNameAvailabilityRequestSchema,
  organizationNameAvailabilityResponseSchema,
  organizationProfileSchema,
  organizationSlugAvailabilityRequestSchema,
  organizationSlugAvailabilityResponseSchema,
  resolvePostAuthDestinationResponseSchema,
  setOrganizationLogoRequestSchema,
  updateOrganizationProfileRequestSchema,
} from "@futrob/api-contracts";
import { resolvePostAuthDestination } from "@futrob/organizations";
import { asOrganizationId } from "@futrob/shared-kernel";
import type { AppDeps } from "@/app.ts";
import { failureToHttp, validationErrorResponse } from "@/http/errors.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { jsonResponse } from "@/utils/http-response.ts";
import { membershipDto, organizationProfileDto } from "./organization-dto.ts";

export function registerOrganizationRoutes(app: Hono, deps: AppDeps): void {
  const { identity, organizations } = deps.modules;
  const auth = createServiceAuthMiddleware(deps.internalJobSecret);
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();

  secured.use("*", auth);

  secured.post("/organizations/name-availability", async (c) => {
    const parsed = organizationNameAvailabilityRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    return jsonResponse(
      organizationNameAvailabilityResponseSchema.parse(
        await organizations.checkOrganizationName.execute(parsed.data),
      ),
    );
  });

  secured.get("/organizations/mine", async (c) => {
    const actorId = c.get("actorId");
    const memberships = await organizations.listMembershipsForActor.execute({ actorId });
    const body = listMyMembershipsResponseSchema.parse({
      memberships: memberships.map(membershipDto),
    });
    return jsonResponse(body);
  });

  secured.get("/organizations/post-auth-destination", async (c) => {
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

  secured.post("/organizations", async (c) => {
    const actorId = c.get("actorId");
    const json: unknown = await c.req.json().catch(() => null);
    const parsed = createOrganizationRequestSchema.safeParse(json);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues);
    }

    const result = await organizations.createOrganization.execute({
      name: parsed.data.name,
      actorId,
      timeZone: parsed.data.timeZone,
      slug: parsed.data.slug,
      // Namespaced so a client can never replay another actor's key (e.g. onboarding's).
      creationKey: parsed.data.creationKey
        ? `organization:${actorId}:${parsed.data.creationKey}`
        : undefined,
    });
    if (!result.isOk()) {
      return failureToHttp(result.error);
    }

    const body = createOrganizationResponseSchema.parse({
      ...organizationProfileDto(result.value.organization),
      role: result.value.role,
    });
    return jsonResponse(body, 201);
  });

  secured.post("/organizations/slug-availability", async (c) => {
    const parsed = organizationSlugAvailabilityRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    return jsonResponse(
      organizationSlugAvailabilityResponseSchema.parse(
        await organizations.checkOrganizationSlug.execute({
          slug: parsed.data.slug,
          organizationId: parsed.data.organizationId
            ? asOrganizationId(parsed.data.organizationId)
            : undefined,
        }),
      ),
    );
  });

  secured.get("/organizations/:organizationId", async (c) => {
    const result = await organizations.getOrganizationProfile.execute({
      organizationId: asOrganizationId(c.req.param("organizationId")),
      actorId: c.get("actorId"),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(organizationProfileSchema.parse(organizationProfileDto(result.value)));
  });

  secured.patch("/organizations/:organizationId", async (c) => {
    const parsed = updateOrganizationProfileRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const result = await organizations.updateOrganizationProfile.execute({
      organizationId: asOrganizationId(c.req.param("organizationId")),
      actorId: c.get("actorId"),
      ...parsed.data,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(organizationProfileSchema.parse(organizationProfileDto(result.value)));
  });

  secured.put("/organizations/:organizationId/logo", async (c) => {
    const parsed = setOrganizationLogoRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const result = await organizations.setOrganizationLogo.execute({
      organizationId: asOrganizationId(c.req.param("organizationId")),
      actorId: c.get("actorId"),
      logo: parsed.data.logo,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(organizationProfileSchema.parse(organizationProfileDto(result.value)));
  });

  secured.post("/organizations/:organizationId/invitations", async (c) => {
    const actorId = c.get("actorId");
    const json: unknown = await c.req.json().catch(() => null);
    const parsed = createOrganizationInvitationRequestSchema.safeParse(json);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues);
    }

    const result = await organizations.createInvitation.execute({
      organizationId: asOrganizationId(c.req.param("organizationId")),
      role: parsed.data.role,
      invitedByActorId: actorId,
      email: parsed.data.email,
      expiresInMs: parsed.data.expiresInMs,
      redeemPolicy: parsed.data.redeemPolicy,
      maxRedemptions: parsed.data.maxRedemptions,
    });
    if (!result.isOk()) {
      return failureToHttp(result.error);
    }

    const body = createInvitationResponseSchema.parse({
      invitationId: result.value.invitationId,
      competitionId: null,
      token: result.value.token,
      expiresAt: result.value.expiresAt.toISOString(),
      redeemPolicy: result.value.redeemPolicy,
      maxRedemptions: result.value.maxRedemptions,
    });
    return jsonResponse(body, 201);
  });

  secured.post("/organizations/invitations/accept", async (c) => {
    const actorId = c.get("actorId");
    const json: unknown = await c.req.json().catch(() => null);
    const parsed = acceptInvitationRequestSchema.safeParse(json);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues);
    }

    const result = await organizations.acceptInvitation.execute({
      token: parsed.data.token,
      actorId,
    });
    if (!result.isOk()) {
      return failureToHttp(result.error);
    }

    const body = acceptInvitationResponseSchema.parse({
      organizationId: result.value.organizationId,
      organizationName: result.value.organizationName,
      role: result.value.role,
      competitionId: result.value.competitionId,
      competitionRole: result.value.competitionRole,
    });
    return jsonResponse(body);
  });

  app.route("/", secured);
}
