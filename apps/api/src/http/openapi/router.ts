import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "hono";
import { validationErrorResponse } from "@/http/errors.ts";

export function createOpenApiRouter<E extends Env = Env>(): OpenAPIHono<E> {
  return new OpenAPIHono<E>({
    defaultHook: (result) => {
      if (!result.success) {
        return validationErrorResponse(result.error.issues);
      }
    },
  });
}
