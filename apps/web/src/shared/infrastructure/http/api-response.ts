import type { ApiErrorBody, ApiErrorDetails } from "@futrob/api-contracts";

export type HttpMappableFailure = {
  readonly code: string;
  readonly details?: ApiErrorDetails;
};

const DETAIL_KEYS = [
  "organizationId",
  "role",
  "status",
  "path",
  "body",
  "issues",
  "externalClubId",
  "cause",
  "completedPath",
  "requestedPath",
] as const satisfies readonly (keyof ApiErrorDetails)[];

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function textResponse(body: string, contentType: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
    },
  });
}

export function apiErrorResponse(status: number, body: ApiErrorBody): Response {
  return jsonResponse(body, status);
}

export function failureToHttp(error: HttpMappableFailure): Response {
  const status = statusForFailureCode(error.code);
  return apiErrorResponse(status, {
    code: error.code,
    messageKey: `errors.${error.code}`,
    details: error.details ?? detailsFromTaggedProps(error),
  });
}

function detailsFromTaggedProps(error: HttpMappableFailure): ApiErrorDetails | undefined {
  const details: Partial<ApiErrorDetails> = {};
  for (const key of DETAIL_KEYS) {
    if (!Object.hasOwn(error, key)) continue;
    const value = Reflect.get(error, key);
    if (value !== undefined) {
      Object.assign(details, { [key]: value });
    }
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
  if (code.includes("conflict")) {
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

export function queryRecord(url: URL): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    out[key] = value;
  }
  return out;
}
