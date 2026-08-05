import type { ApiErrorBody } from "@futrob/api-contracts";
import { TaggedError } from "@futrob/shared-kernel";
import { jsonResponse } from "@/utils/http-response.ts";

/** Wire-facing expected failure: TaggedError (or structural `{ code }`) with stable wire `code`. */
export type HttpMappableFailure = {
  readonly code: string;
  readonly details?: Readonly<Record<string, unknown>>;
};

export function apiErrorResponse(status: number, body: ApiErrorBody): Response {
  return jsonResponse(body, status);
}

export function validationErrorResponse(issues: unknown): Response {
  return apiErrorResponse(400, {
    code: "api.validation_error",
    messageKey: "errors.api.validation_error",
    details: { issues },
  });
}

export function failureToHttp(error: HttpMappableFailure): Response {
  return apiErrorResponse(statusForFailureCode(error.code), {
    code: error.code,
    messageKey: `errors.${error.code}`,
    details: error.details ?? detailsFromTaggedProps(error),
  });
}

/** TaggedError expected failures that carry a stable wire `code`. */
export function isHttpMappableFailure(error: unknown): error is HttpMappableFailure {
  return (
    TaggedError.is(error) &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

function detailsFromTaggedProps(
  error: HttpMappableFailure,
): Readonly<Record<string, unknown>> | undefined {
  const details: Record<string, unknown> = {};
  const copy = (key: string) => {
    if (key in error && (error as Record<string, unknown>)[key] !== undefined) {
      details[key] = (error as Record<string, unknown>)[key];
    }
  };
  for (const key of [
    "organizationId",
    "role",
    "status",
    "path",
    "body",
    "issues",
    "externalClubId",
    "cause",
  ] as const) {
    copy(key);
  }
  return Object.keys(details).length > 0 ? details : undefined;
}

function statusForFailureCode(code: string): number {
  if (code.includes("not_found")) {
    return 404;
  }
  if (code.includes("forbidden") || code.includes("unauthorized") || code.includes("not_owned")) {
    return 403;
  }
  if (code.includes("conflict") || code.includes("exhausted")) {
    return 409;
  }
  if (
    code.includes("schema") ||
    code.includes("unsupported") ||
    code.includes("validation") ||
    code.includes("invalid") ||
    code.includes("expired") ||
    code.includes("revoked")
  ) {
    return 400;
  }
  if (code.includes("timeout") || code.includes("http_error") || code.includes("network")) {
    return 502;
  }
  return 500;
}
