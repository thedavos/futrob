import type { futrobOpenApiV1 } from "./document.ts";

export const OPENAPI_HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

export type OpenApiHttpMethod = (typeof OPENAPI_HTTP_METHODS)[number];

export type FutrobOpenApiDocument = typeof futrobOpenApiV1;

type FutrobOpenApiPaths = FutrobOpenApiDocument["paths"];

type FutrobOpenApiPathItemFromDocument = FutrobOpenApiPaths[keyof FutrobOpenApiPaths];

type FutrobOpenApiOperationFromDocument = {
  [Path in keyof FutrobOpenApiPaths]: {
    [Method in OpenApiHttpMethod]: Method extends keyof FutrobOpenApiPaths[Path]
      ? FutrobOpenApiPaths[Path][Method]
      : never;
  }[OpenApiHttpMethod];
}[keyof FutrobOpenApiPaths];

export type OpenApiHeaderReference = { readonly $ref: string };

export type OpenApiHeaderMap = Record<string, OpenApiHeaderReference>;

export type FutrobOpenApiInlineResponse = {
  headers?: OpenApiHeaderMap;
  description?: string;
  content?: unknown;
};

export type FutrobOpenApiResponseEntry = FutrobOpenApiInlineResponse | OpenApiHeaderReference;

type OpenApiOperationAugmentable = {
  parameters?: readonly unknown[];
  responses?: Record<string, FutrobOpenApiResponseEntry>;
};

export type FutrobOpenApiOperation = NonNullable<FutrobOpenApiOperationFromDocument> &
  OpenApiOperationAugmentable;

export type FutrobOpenApiResponses = NonNullable<FutrobOpenApiOperation["responses"]>;

export type FutrobOpenApiPathItem = Partial<
  Record<OpenApiHttpMethod, NonNullable<FutrobOpenApiOperationFromDocument>>
>;

export function getOpenApiOperation(
  pathItem: FutrobOpenApiPathItemFromDocument | FutrobOpenApiPathItem | undefined,
  method: OpenApiHttpMethod,
): FutrobOpenApiOperation | undefined {
  if (!pathItem) return undefined;
  switch (method) {
    case "get":
      return "get" in pathItem ? pathItem.get : undefined;
    case "post":
      return "post" in pathItem ? pathItem.post : undefined;
    case "put":
      return "put" in pathItem ? pathItem.put : undefined;
    case "patch":
      return "patch" in pathItem ? pathItem.patch : undefined;
    case "delete":
      return "delete" in pathItem ? pathItem.delete : undefined;
    default: {
      const exhaustive: never = method;
      return exhaustive;
    }
  }
}

export function getOpenApiResponse(
  operation: FutrobOpenApiOperation | undefined,
  statusCode: string,
): FutrobOpenApiResponseEntry | undefined {
  const responses = operation?.responses;
  if (!responses) return undefined;
  if (!(statusCode in responses)) return undefined;
  return responses[statusCode];
}

export function isInlineOpenApiResponse(
  value: FutrobOpenApiResponseEntry,
): value is FutrobOpenApiInlineResponse {
  return !("$ref" in value);
}
