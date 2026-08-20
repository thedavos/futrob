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

type MutableInlineOpenApiResponse = {
  headers?: OpenApiHeaderMap;
};

type MutableOpenApiResponseEntry = OpenApiHeaderReference | MutableInlineOpenApiResponse;

type MutableOpenApiOperation = {
  parameters?: readonly unknown[];
  responses?: Record<string, MutableOpenApiResponseEntry>;
};

type MutableOpenApiPathItem = Partial<Record<OpenApiHttpMethod, MutableOpenApiOperation>>;

export type MutableFutrobOpenApiDocument = {
  paths: FutrobOpenApiDocument["paths"];
};

const requestIdParameterReference = { $ref: "#/components/parameters/RequestId" } as const;
const requestIdHeaderReference = { $ref: "#/components/headers/RequestId" } as const;

function mutableOpenApiPaths(
  paths: FutrobOpenApiDocument["paths"],
): Record<string, MutableOpenApiPathItem> {
  // SAFETY: Static OpenAPI paths are mutated in place for cross-cutting correlation metadata only.
  return paths as Record<string, MutableOpenApiPathItem>;
}

export function getOpenApiOperation(
  pathItem: FutrobOpenApiPathItemFromDocument,
  method: OpenApiHttpMethod,
): FutrobOpenApiOperation | undefined {
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

/** Injects request-id correlation metadata into every operation after the static document is built. */
export function augmentOpenApiRequestCorrelation(document: MutableFutrobOpenApiDocument): void {
  const paths = mutableOpenApiPaths(document.paths);
  for (const pathItem of Object.values(paths)) {
    for (const method of OPENAPI_HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;

      const parameters = operation.parameters;
      operation.parameters = [
        requestIdParameterReference,
        ...(Array.isArray(parameters) ? parameters : []),
      ];

      const responses = operation.responses;
      if (!responses) continue;

      for (const response of Object.values(responses)) {
        if ("$ref" in response) continue;

        response.headers = {
          ...(response.headers ?? {}),
          "X-Request-ID": requestIdHeaderReference,
        };
      }
    }
  }
}
