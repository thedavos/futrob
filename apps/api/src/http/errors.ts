import type { ApiErrorBody, ApiErrorDetails } from "@futrob/api-contracts";
import { apiErrorDetailsSchema, planLimitDetailSchema } from "@futrob/api-contracts";
import type { AnyTaggedError } from "@futrob/shared-kernel";
import type { HTTPException } from "hono/http-exception";
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

const MALFORMED_JSON_ISSUE: ZodIssue = {
  code: "custom",
  path: [],
  message: "Request body is not valid JSON",
};

/**
 * OpenAPIHono / Hono validators throw HTTPException before `defaultHook`:
 * malformed JSON (400) and undeclared media types (415). Map only those
 * body-parse failures onto the ApiError envelope. Do not rewrite other
 * HTTPExceptions, and never echo Hono's `error.message` to clients.
 */
export function openApiHttpExceptionResponse(error: HTTPException): Response | undefined {
  if (error.res) return undefined;
  if (error.status === 415) {
    return apiErrorResponse(415, {
      code: "api.unsupported_media_type",
      messageKey: "errors.api.unsupported_media_type",
    });
  }
  if (error.status === 400) {
    return validationErrorResponse([MALFORMED_JSON_ISSUE]);
  }
  return undefined;
}

/** `status` overrides the code heuristic for routes that map their failures explicitly. */
export function failureToHttp(error: HttpMappableFailure, status?: number): Response {
  const retryAfterSeconds =
    error.retryAfterSeconds ??
    (error.retryAfterMs === undefined
      ? undefined
      : Math.max(1, Math.ceil(error.retryAfterMs / 1_000)));
  const response = apiErrorResponse(status ?? statusForFailureCode(error.code), {
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
const rescheduleNoticeDetailsSchema = apiErrorDetailsSchema.pick({ anchor: true }).strip();

const planGatedPropsSchema = z.object({
  limit: z.string().optional(),
  max: z.number().int().nonnegative().optional(),
  used: z.number().int().nonnegative().optional(),
  resetsAt: z.date().optional(),
  format: z.string().optional(),
});

function planLimitForCode(code: string, propLimit: string | undefined) {
  if (code === "organizations.staff_limit_reached") return "staff_members";
  if (code === "game_data.sync_quota_exhausted" || code === "billing.quota_exhausted") {
    return "provider_sync_jobs";
  }
  return propLimit;
}

/** Only the plan fields a client needs for its upsell copy; never tenant data. */
function planGatedDetails(error: HttpMappableFailure): ApiErrorDetails | undefined {
  const props = planGatedPropsSchema.safeParse(error);
  if (!props.success) return undefined;
  const planLimit = planLimitDetailSchema.safeParse(planLimitForCode(error.code, props.data.limit));
  const details = {
    planLimit: planLimit.success ? planLimit.data : undefined,
    max: props.data.max,
    used: props.data.used,
    resetsAt: props.data.resetsAt?.toISOString(),
    format: props.data.format,
  };
  const defined = Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== undefined),
  );
  return Object.keys(defined).length > 0 ? apiErrorDetailsSchema.parse(defined) : undefined;
}

function detailsFromTaggedProps(error: HttpMappableFailure): ApiErrorDetails | undefined {
  if (error.code.startsWith("game_data.ea_clubs_")) return undefined;
  if (isPlanGatedFailureCode(error.code)) return planGatedDetails(error);
  if (error.code === "scheduling.reschedule_notice_not_met") {
    return rescheduleNoticeDetailsSchema.parse(error);
  }
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

/**
 * Plan gating (ADR-0025): the plan does not include the action. 402 lets clients show an
 * upsell instead of a permission error. Codes are owned by each consumer context.
 */
const PLAN_GATED_FAILURE_CODES: ReadonlySet<string> = new Set([
  "billing.quota_exhausted",
  "billing.feature_not_in_plan",
  "competitions.plan_limit_reached",
  "competitions.format_not_in_plan",
  "organizations.staff_limit_reached",
  "game_data.sync_quota_exhausted",
  "statistics.performance_ranking_not_in_plan",
  "analytics.premium_not_in_plan",
]);

export function isPlanGatedFailureCode(code: string): boolean {
  return PLAN_GATED_FAILURE_CODES.has(code);
}

function statusForFailureCode(code: string): number {
  if (isPlanGatedFailureCode(code)) return 402;
  if (
    code === "game_data.provider_unavailable" ||
    code === "game_data.provider_refresh_in_progress" ||
    code === "results.candidate_data_unavailable" ||
    code === "scheduling.schedule_change_expiry_actor_unavailable" ||
    code === "results.confirmation_expiry_actor_unavailable"
  ) {
    return 503;
  }
  if (code.includes("not_found") || code.includes("not_discoverable")) {
    return 404;
  }
  if (
    code.includes("forbidden") ||
    code.includes("unauthorized") ||
    code.includes("not_owned") ||
    code === "scheduling.schedule_change_authority_not_required"
  ) {
    return 403;
  }
  if (
    code === "results.confirmation_window_closed" ||
    code === "scheduling.schedule_change_response_window_closed" ||
    code.includes("conflict") ||
    code.includes("exhausted") ||
    code.includes("roster_full") ||
    code.includes("roster_locked") ||
    code.includes("roster_entry_inactive") ||
    code.includes("already_decided") ||
    code.includes("captain_already_assigned") ||
    code.includes("not_editable") ||
    code.includes("publish_blocked") ||
    code.includes("registration_closed") ||
    code.includes("capacity_reached") ||
    code.includes("limit_reached") ||
    code.includes("rescheduling_disabled") ||
    code === "scheduling.reschedule_notice_not_met" ||
    code.includes("active_schedule_change_request_exists") ||
    code === "scheduling.schedule_change_request_closed" ||
    code === "scheduling.schedule_change_proposal_stale" ||
    code === "scheduling.schedule_change_consent_already_recorded" ||
    code === "scheduling.schedule_change_approval_not_configured" ||
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
