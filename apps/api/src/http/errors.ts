import type { ApiErrorBody, ApiErrorDetails } from "@futrob/api-contracts";
import { apiErrorDetailsSchema } from "@futrob/api-contracts";
import type { AnyTaggedError } from "@futrob/shared-kernel";
import { z, type ZodIssue } from "zod";
import { currentRequestCorrelation } from "@/context/request-correlation.ts";
import { jsonResponse } from "@/utils/http-response.ts";

/** Wire-facing expected failure: TaggedError (or structural `{ code }`) with stable wire `code`. */
export type HttpMappableFailure = {
  readonly code: string;
  readonly details?: ApiErrorDetails;
  readonly retryAfterSeconds?: number;
  readonly retryAfterMs?: number;
};

export function apiErrorResponse(status: number, body: ApiErrorBody): Response {
  const correlation = currentRequestCorrelation();
  return jsonResponse(correlation ? { ...body, requestId: correlation.requestId } : body, status);
}

export function validationErrorResponse(issues: ZodIssue[]): Response {
  return apiErrorResponse(400, {
    code: "api.validation_error",
    messageKey: "errors.api.validation_error",
    details: { issues },
  });
}

export function failureToHttp(error: HttpMappableFailure): Response {
  const retryAfterSeconds =
    error.retryAfterSeconds ??
    (error.retryAfterMs === undefined
      ? undefined
      : Math.max(1, Math.ceil(error.retryAfterMs / 1_000)));
  const response = apiErrorResponse(statusForFailureCode(error.code), {
    code: error.code,
    messageKey: `errors.${error.code}`,
    retryAfterSeconds,
    details: error.details ?? detailsFromTaggedProps(error),
  });
  if (retryAfterSeconds) {
    response.headers.set("Retry-After", String(retryAfterSeconds));
  }
  return response;
}

const httpMappableFailureSchema = z.object({
  code: z.string(),
  details: z.custom<ApiErrorDetails>().optional(),
  retryAfterSeconds: z.number().optional(),
  retryAfterMs: z.number().optional(),
});

const taggedErrorDetailsSchema = apiErrorDetailsSchema.partial();

function detailsFromTaggedProps(error: HttpMappableFailure): ApiErrorDetails | undefined {
  if (error.code.startsWith("game_data.ea_clubs_")) return undefined;
  const parsed = taggedErrorDetailsSchema.safeParse(error);
  if (!parsed.success) return undefined;
  return Object.keys(parsed.data).length > 0 ? parsed.data : undefined;
}

/** TaggedError expected failures that carry a stable wire `code`. */
export function isHttpMappableFailure(
  error: AnyTaggedError,
): error is AnyTaggedError & HttpMappableFailure {
  return httpMappableFailureSchema.safeParse(error).success;
}

function statusForFailureCode(code: string): number {
  if (
    code === "game_data.provider_unavailable" ||
    code === "game_data.provider_refresh_in_progress"
  ) {
    return 503;
  }
  if (code.includes("not_found")) {
    return 404;
  }
  if (code.includes("forbidden") || code.includes("unauthorized") || code.includes("not_owned")) {
    return 403;
  }
  if (
    code.includes("conflict") ||
    code.includes("exhausted") ||
    code.includes("roster_full") ||
    code.includes("roster_locked") ||
    code.includes("roster_entry_inactive") ||
    code.includes("already_decided") ||
    code.includes("captain_already_assigned") ||
    code.includes("not_editable") ||
    code.includes("publish_blocked") ||
    code.includes("last_organizer") ||
    code.includes("last_superuser")
  ) {
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
