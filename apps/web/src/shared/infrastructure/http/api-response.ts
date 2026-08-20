import {
  REQUEST_ID_HEADER,
  apiErrorDetailsSchema,
  type ApiErrorBody,
  type ApiErrorDetails,
  type RequestId,
} from "@futrob/api-contracts";

export type HttpMappableFailure = {
  readonly code: string;
  readonly details?: ApiErrorDetails;
};

export type JsonSerializable =
  | string
  | number
  | boolean
  | null
  | ApiErrorBody
  | readonly JsonSerializable[]
  | { readonly [key: string]: JsonSerializable };

export function jsonResponse(data: JsonSerializable, status = 200): Response {
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

export function apiErrorResponse(
  status: number,
  body: ApiErrorBody,
  requestId?: RequestId,
): Response {
  const resolvedRequestId = requestId ?? body.requestId;
  const response = jsonResponse(
    resolvedRequestId ? { ...body, requestId: resolvedRequestId } : body,
    status,
  );
  if (resolvedRequestId) response.headers.set(REQUEST_ID_HEADER, resolvedRequestId);
  return response;
}

export function failureToHttp(error: HttpMappableFailure): Response {
  const status = statusForFailureCode(error.code);
  return apiErrorResponse(status, {
    code: error.code,
    messageKey: `errors.${error.code}`,
    details: error.details ?? detailsFromTaggedProps(error),
  });
}

const taggedErrorDetailsSchema = apiErrorDetailsSchema.partial();

function detailsFromTaggedProps(error: HttpMappableFailure): ApiErrorDetails | undefined {
  const taggedDetails = taggedErrorDetailsSchema.safeParse(error);
  if (!taggedDetails.success) {
    return undefined;
  }
  return Object.keys(taggedDetails.data).length > 0 ? taggedDetails.data : undefined;
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

export function queryRecord(url: URL) {
  const out: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    out[key] = value;
  }
  return out satisfies Readonly<Record<string, string>>;
}
