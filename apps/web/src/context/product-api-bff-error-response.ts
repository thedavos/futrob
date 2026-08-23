import type { RequestId } from "@futrob/api-contracts";
import { FutrobApiError } from "@futrob/sdk";
import { AuthUnauthenticatedError } from "@/context/auth.ts";
import { ProductApiUnreachableError } from "@/context/product-api-client.ts";
import {
  AuthServiceMisconfiguredError,
  AuthServiceUnavailableError,
} from "@/modules/identity/server/auth-errors.ts";
import { apiErrorResponse } from "@/shared/infrastructure/http/api-response.ts";
import { BffRateLimitUnavailableError } from "@/shared/infrastructure/rate-limit/enforce-bff-rate-limit.ts";

export interface ProductApiBffMisconfiguredFailure extends Error {
  readonly code: "product_api.bff_misconfigured";
}

export type ClassifiedProductApiBffError =
  | { readonly kind: "rate_limit_unavailable"; readonly error: BffRateLimitUnavailableError }
  | { readonly kind: "misconfigured"; readonly error: ProductApiBffMisconfiguredFailure }
  | { readonly kind: "auth_misconfigured"; readonly error: AuthServiceMisconfiguredError }
  | { readonly kind: "auth_unavailable"; readonly error: AuthServiceUnavailableError }
  | { readonly kind: "unauthenticated"; readonly error: AuthUnauthenticatedError }
  | { readonly kind: "unreachable"; readonly error: ProductApiUnreachableError }
  | { readonly kind: "futrob_api"; readonly error: FutrobApiError }
  | { readonly kind: "unexpected" };

export function classifyProductApiBffError(error: Error): ClassifiedProductApiBffError {
  if (error instanceof BffRateLimitUnavailableError) {
    return { kind: "rate_limit_unavailable", error };
  }
  if (isProductApiBffMisconfiguredFailure(error)) {
    return { kind: "misconfigured", error };
  }
  if (error instanceof AuthServiceMisconfiguredError) {
    return { kind: "auth_misconfigured", error };
  }
  if (error instanceof AuthServiceUnavailableError) {
    return { kind: "auth_unavailable", error };
  }
  if (error instanceof AuthUnauthenticatedError) {
    return { kind: "unauthenticated", error };
  }
  if (error instanceof ProductApiUnreachableError) {
    return { kind: "unreachable", error };
  }
  if (error instanceof FutrobApiError) {
    return { kind: "futrob_api", error };
  }
  return { kind: "unexpected" };
}

export function productApiBffErrorResponse(
  error: ClassifiedProductApiBffError,
  requestId?: RequestId,
): Response {
  switch (error.kind) {
    case "rate_limit_unavailable":
      return apiErrorResponse(
        503,
        {
          code: error.error.code,
          messageKey: "errors.api.rate_limit_unavailable",
        },
        requestId,
      );
    case "misconfigured":
      return apiErrorResponse(
        503,
        {
          code: error.error.code,
          messageKey: "errors.product_api.bff_misconfigured",
        },
        requestId,
      );
    case "auth_misconfigured":
      return apiErrorResponse(
        503,
        {
          code: error.error.code,
          messageKey: "errors.auth.misconfigured",
        },
        requestId,
      );
    case "auth_unavailable":
      return apiErrorResponse(
        503,
        {
          code: error.error.code,
          messageKey: "errors.auth.unavailable",
        },
        requestId,
      );
    case "unauthenticated":
      return apiErrorResponse(
        401,
        {
          code: "auth.unauthenticated",
          messageKey: "errors.auth.unauthenticated",
        },
        requestId,
      );
    case "unreachable":
      return apiErrorResponse(
        503,
        {
          code: error.error.code,
          messageKey: "errors.product_api.unreachable",
        },
        requestId,
      );
    case "futrob_api":
      return apiErrorResponse(
        error.error.status,
        {
          code: error.error.code,
          messageKey: error.error.messageKey,
          details: error.error.details,
          requestId: error.error.requestId,
          retryAfterSeconds: error.error.retryAfterSeconds,
        },
        requestId,
      );
    case "unexpected":
      return apiErrorResponse(
        500,
        {
          code: "api.unexpected_error",
          messageKey: "errors.api.unexpected_error",
        },
        requestId,
      );
    default: {
      const _exhaustive: never = error;
      throw new Error(`unhandled BFF error kind: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

export function productApiBffErrorResponseForError(error: Error, requestId?: RequestId): Response {
  return productApiBffErrorResponse(classifyProductApiBffError(error), requestId);
}

function isProductApiBffMisconfiguredFailure(
  error: Error,
): error is ProductApiBffMisconfiguredFailure {
  return "code" in error && error.code === "product_api.bff_misconfigured";
}
