export { apiErrorSchema, type ApiErrorBody } from "./errors.ts";
export { pingResponseSchema, type PingResponse } from "./meta/ping.response.ts";
export * from "./game-data/index.ts";
export * from "./identity/index.ts";
export * from "./organizations/index.ts";
export { futrobOpenApiV1 } from "./openapi/document.ts";
export { getOpenApiJsonDocument, getOpenApiJsonText, getOpenApiYamlText } from "./openapi/serve.ts";

export const apiV1 = {
  version: "v1" as const,
};
