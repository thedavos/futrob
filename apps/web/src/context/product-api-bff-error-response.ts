import type { RequestId } from "@futrob/api-contracts";
import { FutrobApiError } from "@futrob/sdk";
import { AuthUnauthenticatedError } from "@/context/auth.ts";
import { apiErrorResponse } from "@/shared/infrastructure/http/api-response.ts";

export interface ProductApiBffMisconfiguredFailure extends Error {
  readonly code: "product_api.bff_misconfigured";
}

export function productApiBffErrorResponse(error: unknown, requestId?: RequestId): Response {
  if (isProductApiBffMisconfiguredFailure(error)) {
    return apiErrorResponse(
      503,
      {
        code: error.code,
        messageKey: "errors.product_api.bff_misconfigured",
      },
      requestId,
    );
  }

  if (error instanceof AuthUnauthenticatedError) {
    return apiErrorResponse(
      401,
      {
        code: "auth.unauthenticated",
        messageKey: "errors.auth.unauthenticated",
      },
      requestId,
    );
  }

  if (error instanceof FutrobApiError) {
    return apiErrorResponse(
      error.status,
      {
        code: error.code,
        messageKey: error.messageKey,
        details: error.details,
        requestId: error.requestId,
      },
      requestId,
    );
  }

  if (requestId) {
    return apiErrorResponse(
      500,
      {
        code: "api.unexpected_error",
        messageKey: "errors.api.unexpected_error",
      },
      requestId,
    );
  }
  throw error;
}

function isProductApiBffMisconfiguredFailure(
  error: unknown,
): error is ProductApiBffMisconfiguredFailure {
  return (
    error instanceof Error && "code" in error && error.code === "product_api.bff_misconfigured"
  );
}
