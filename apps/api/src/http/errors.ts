import type { DomainError } from "@futrob/shared-kernel";
import type { ApiErrorBody } from "@futrob/api-contracts";
import { jsonResponse } from "@/utils/http-response.ts";

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

export function domainErrorToHttp(error: DomainError): Response {
  return apiErrorResponse(statusForDomainCode(error.code), {
    code: error.code,
    messageKey: `errors.${error.code}`,
    details: error.details,
  });
}

function statusForDomainCode(code: string): number {
  if (code.includes("not_found")) {
    return 404;
  }
  if (code.includes("forbidden") || code.includes("unauthorized")) {
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
