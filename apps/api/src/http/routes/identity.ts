import { Hono } from "hono";
import {
  completeOnboardingRequestSchema,
  completeOnboardingResponseSchema,
  getOnboardingStatusResponseSchema,
  saveOnboardingProgressRequestSchema,
  saveOnboardingProgressResponseSchema,
} from "@futrob/api-contracts";
import type { AppDeps } from "@/app.ts";
import { validationErrorResponse } from "@/http/errors.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerIdentityRoutes(app: Hono, deps: AppDeps): void {
  const { identity } = deps.modules;
  const auth = createServiceAuthMiddleware(deps.internalJobSecret);
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();

  secured.use("*", auth);

  secured.get("/identity/onboarding", async (c) => {
    const status = await identity.getOnboardingStatus.execute({
      actorId: c.get("actorId"),
    });
    return jsonResponse(
      getOnboardingStatusResponseSchema.parse({
        ...status,
        completedAt: status.completedAt?.toISOString() ?? null,
      }),
    );
  });

  secured.post("/identity/onboarding", async (c) => {
    const json: unknown = await c.req.json().catch(() => null);
    const parsed = completeOnboardingRequestSchema.safeParse(json);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues);
    }

    const status = await identity.completeOnboarding.execute({
      actorId: c.get("actorId"),
      path: parsed.data.path,
      version: parsed.data.version,
    });
    return jsonResponse(
      completeOnboardingResponseSchema.parse({
        ...status,
        completedAt: status.completedAt?.toISOString() ?? null,
      }),
    );
  });

  secured.patch("/identity/onboarding", async (c) => {
    const json: unknown = await c.req.json().catch(() => null);
    const parsed = saveOnboardingProgressRequestSchema.safeParse(json);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues);
    }

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

  app.route("/", secured);
}
