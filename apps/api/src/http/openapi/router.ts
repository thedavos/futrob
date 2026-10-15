import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "hono";
import { validationErrorResponse } from "@/http/errors.ts";
import {
  createInternalJobAuthMiddleware,
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";

export type ServiceAuthEnv = { Variables: ServiceAuthVariables };

export function createOpenApiRouter<E extends Env = Env>(): OpenAPIHono<E> {
  return new OpenAPIHono<E>({
    defaultHook: (result) => {
      if (!result.success) {
        return validationErrorResponse(result.error.issues);
      }
    },
  });
}

export function createServiceOpenApiRouter(internalJobSecret: string): OpenAPIHono<ServiceAuthEnv> {
  const router = createOpenApiRouter<ServiceAuthEnv>();
  router.use("*", createServiceAuthMiddleware(internalJobSecret));
  return router;
}

export function createInternalOpenApiRouter(internalJobSecret: string): OpenAPIHono {
  const router = createOpenApiRouter();
  router.use("*", createInternalJobAuthMiddleware(internalJobSecret));
  return router;
}
