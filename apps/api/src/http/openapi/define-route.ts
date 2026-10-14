import { createRoute, type RouteConfig } from "@hono/zod-openapi";
import type { z } from "zod";
import { API_ERROR_RESPONSE, RATE_LIMITED_RESPONSE } from "@/http/openapi/responses.ts";

export const OPENAPI_ERROR_STATUSES = [400, 401, 403, 404, 409, 415, 429, 502, 503] as const;

export type OpenApiErrorStatus = (typeof OPENAPI_ERROR_STATUSES)[number];
export type OpenApiSuccessStatus = 200 | 201 | 202 | 204;

type RouteRequest = NonNullable<RouteConfig["request"]>;
type RouteResponses = RouteConfig["responses"];

export type OpenApiRouteSpec = {
  readonly method: "get" | "post" | "put" | "patch" | "delete";
  readonly path: string;
  readonly operationId: string;
  readonly tags: readonly string[];
  readonly summary: string;
  readonly description?: string;
  readonly public?: boolean;
  readonly params?: NonNullable<RouteRequest["params"]>;
  readonly query?: NonNullable<RouteRequest["query"]>;
  readonly body?: z.ZodType;
  readonly success: {
    readonly status: OpenApiSuccessStatus;
    readonly description: string;
    readonly schema?: z.ZodType;
    readonly mediaType?: "application/json" | "application/yaml";
  };
  readonly errors?: readonly OpenApiErrorStatus[];
  readonly errorDescriptions?: Partial<Record<OpenApiErrorStatus, string>>;
  readonly extraResponses?: Readonly<
    Record<number, { readonly description: string; readonly schema?: z.ZodType }>
  >;
};

function isErrorStatus(status: number): status is OpenApiErrorStatus {
  return OPENAPI_ERROR_STATUSES.some((allowed) => allowed === status);
}

export function defineRoute(spec: OpenApiRouteSpec) {
  const request: RouteRequest = {};
  if (spec.params) request.params = spec.params;
  if (spec.query) request.query = spec.query;
  if (spec.body) {
    request.body = {
      required: true,
      content: { "application/json": { schema: spec.body } },
    };
  }

  const responses: RouteResponses = {};
  if (spec.success.status === 204 || spec.success.schema === undefined) {
    if (spec.success.mediaType && spec.success.schema === undefined) {
      responses[String(spec.success.status)] = {
        description: spec.success.description,
        content: { [spec.success.mediaType]: { schema: { type: "object" } } },
      };
    } else {
      responses[String(spec.success.status)] = { description: spec.success.description };
    }
  } else {
    responses[String(spec.success.status)] = {
      description: spec.success.description,
      content: {
        [spec.success.mediaType ?? "application/json"]: { schema: spec.success.schema },
      },
    };
  }

  for (const [status, extra] of Object.entries(spec.extraResponses ?? {})) {
    responses[status] = extra.schema
      ? {
          description: extra.description,
          content: { "application/json": { schema: extra.schema } },
        }
      : { description: extra.description };
  }

  for (const status of spec.errors ?? []) {
    if (!isErrorStatus(status)) continue;
    const custom = spec.errorDescriptions?.[status];
    if (status === 429) {
      responses["429"] = custom
        ? { description: custom, content: RATE_LIMITED_RESPONSE.content }
        : RATE_LIMITED_RESPONSE;
      continue;
    }
    responses[String(status)] = custom
      ? { description: custom, content: API_ERROR_RESPONSE.content }
      : API_ERROR_RESPONSE;
  }

  return createRoute({
    method: spec.method,
    path: spec.path,
    operationId: spec.operationId,
    tags: [...spec.tags],
    summary: spec.summary,
    description: spec.description,
    security: spec.public === true ? [] : undefined,
    request: spec.params || spec.query || spec.body ? request : undefined,
    responses,
  });
}
