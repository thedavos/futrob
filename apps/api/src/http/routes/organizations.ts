import { Hono } from "hono";
import {
  acceptInvitationRequestSchema,
  acceptInvitationResponseSchema,
  createInvitationRequestSchema,
  createInvitationResponseSchema,
  createOrganizationRequestSchema,
  createOrganizationResponseSchema,
  listMyMembershipsResponseSchema,
  resolvePostAuthDestinationResponseSchema,
} from "@futrob/api-contracts";
import { resolvePostAuthDestination } from "@futrob/organizations";
import { asOrganizationId } from "@futrob/shared-kernel";
import type { AppDeps } from "@/app.ts";
import { domainErrorToHttp, validationErrorResponse } from "@/http/errors.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerOrganizationRoutes(app: Hono, deps: AppDeps): void {
  const { organizations } = deps.modules;
  const auth = createServiceAuthMiddleware(deps.internalJobSecret);
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();

  secured.use("*", auth);

  secured.get("/organizations/mine", async (c) => {
    const actorId = c.get("actorId");
    const memberships = await organizations.listMembershipsForActor.execute({ actorId });
    const body = listMyMembershipsResponseSchema.parse({
      memberships: memberships.map((membership) => ({
        organizationId: membership.organizationId,
        organizationName: membership.organizationName,
        role: membership.role,
      })),
    });
    return jsonResponse(body);
  });

  secured.get("/organizations/post-auth-destination", async (c) => {
    const actorId = c.get("actorId");
    const memberships = await organizations.listMembershipsForActor.execute({ actorId });
    const destination = resolvePostAuthDestination(memberships);
    const body = resolvePostAuthDestinationResponseSchema.parse({
      destination:
        destination.kind === "organizationPicker"
          ? {
              kind: destination.kind,
              memberships: destination.memberships.map((membership) => ({
                organizationId: membership.organizationId,
                organizationName: membership.organizationName,
                role: membership.role,
              })),
            }
          : destination.kind === "organization"
            ? {
                kind: destination.kind,
                organizationId: destination.organizationId,
              }
            : { kind: destination.kind },
      memberships: memberships.map((membership) => ({
        organizationId: membership.organizationId,
        organizationName: membership.organizationName,
        role: membership.role,
      })),
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
    });
    if (!result.ok) {
      return domainErrorToHttp(result.error);
    }

    const body = createOrganizationResponseSchema.parse({
      organizationId: result.value.organization.id,
      name: result.value.organization.name,
      role: result.value.role,
    });
    return jsonResponse(body, 201);
  });

  secured.post("/organizations/:organizationId/invitations", async (c) => {
    const actorId = c.get("actorId");
    const json: unknown = await c.req.json().catch(() => null);
    const parsed = createInvitationRequestSchema.safeParse(json);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues);
    }

    const result = await organizations.createInvitation.execute({
      organizationId: asOrganizationId(c.req.param("organizationId")),
      role: parsed.data.role,
      invitedByActorId: actorId,
      email: parsed.data.email,
      expiresInMs: parsed.data.expiresInMs,
    });
    if (!result.ok) {
      return domainErrorToHttp(result.error);
    }

    const body = createInvitationResponseSchema.parse({
      invitationId: result.value.invitationId,
      token: result.value.token,
      expiresAt: result.value.expiresAt.toISOString(),
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
    if (!result.ok) {
      return domainErrorToHttp(result.error);
    }

    const body = acceptInvitationResponseSchema.parse({
      organizationId: result.value.organizationId,
      organizationName: result.value.organizationName,
      role: result.value.role,
    });
    return jsonResponse(body);
  });

  app.route("/", secured);
}
