export {
  apiErrorDetailsSchema,
  apiErrorSchema,
  type ApiErrorBody,
  type ApiErrorDetails,
} from "./errors.ts";
export { pingResponseSchema, type PingResponse } from "./meta/ping.response.ts";
export * from "./game-data/index.ts";
export * from "./competitions/index.ts";
export * from "./identity/index.ts";
export * from "./organizations/index.ts";
export * from "./teams/index.ts";
export * from "./authorization/index.ts";
export * from "./encounters/index.ts";
export { futrobOpenApiV1 } from "./openapi/document.ts";
export { getOpenApiJsonDocument, getOpenApiJsonText, getOpenApiYamlText } from "./openapi/serve.ts";

export const apiV1 = {
  version: "v1" as const,
};
