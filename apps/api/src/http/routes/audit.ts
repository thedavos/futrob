import type { Hono } from "hono";
import { z } from "zod";
import { listOrganizationAuditResponseSchema } from "@futrob/api-contracts";
import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import type { AppDeps } from "@/app.ts";
import { apiErrorResponse, failureToHttp } from "@/http/errors.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import { listOrganizationAuditRoute } from "@/http/openapi/routes/audit.ts";
import { jsonResponse } from "@/utils/http-response.ts";

const cursorSchema = z.object({
  scope: z.string(),
  occurredAt: z.string().datetime(),
  id: z.string().min(1),
});

function decodeCursor(cursor: string) {
  try {
    return cursorSchema.safeParse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}

export function registerAuditRoutes(app: Hono, deps: AppDeps): void {
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);
  secured.openapi(listOrganizationAuditRoute, async (c) => {
    const { organizationId } = c.req.valid("param");
    const query = c.req.valid("query");
    const scope = JSON.stringify([
      organizationId,
      query.competitionId ?? null,
      query.actorId ?? null,
      query.action ?? null,
      query.from ?? null,
      query.to ?? null,
    ]);
    const decoded = query.cursor ? decodeCursor(query.cursor) : null;
    if (query.cursor && (!decoded?.success || decoded.data.scope !== scope))
      return apiErrorResponse(400, {
        code: "api.validation_error",
        messageKey: "errors.api.validation_error",
      });
    const result = await deps.modules.audit.list.execute({
      actorId: c.get("actorId"),
      query: {
        organizationId: asOrganizationId(organizationId),
        competitionId: query.competitionId ? asCompetitionId(query.competitionId) : undefined,
        actorId: query.actorId ? asActorId(query.actorId) : undefined,
        action: query.action,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        limit: query.limit,
        cursor: decoded?.success
          ? { occurredAt: new Date(decoded.data.occurredAt), id: decoded.data.id }
          : undefined,
      },
    });
    if (result.isErr()) return failureToHttp(result.error);
    const page = result.value;
    return jsonResponse(
      listOrganizationAuditResponseSchema.parse({
        entries: page.entries.map((entry) => ({
          ...entry,
          occurredAt: entry.occurredAt.toISOString(),
        })),
        nextCursor: page.nextCursor
          ? Buffer.from(
              JSON.stringify({
                scope,
                occurredAt: page.nextCursor.occurredAt.toISOString(),
                id: page.nextCursor.id,
              }),
            ).toString("base64url")
          : null,
      }),
    );
  });
  app.route("/", secured);
}
