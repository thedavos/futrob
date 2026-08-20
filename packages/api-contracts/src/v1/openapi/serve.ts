import { apiErrorSchema } from "../errors.ts";
import { stringify } from "yaml";
import { futrobOpenApiV1 } from "./document.ts";

export function getOpenApiJsonDocument(): typeof futrobOpenApiV1 {
  return futrobOpenApiV1;
}

export function getOpenApiJsonText(): string {
  return `${JSON.stringify(futrobOpenApiV1, null, 2)}\n`;
}

export function getOpenApiYamlText(): string {
  return stringify(futrobOpenApiV1);
}

/** Keep error schema referenced for OpenAPI drift checks. */
void apiErrorSchema;
