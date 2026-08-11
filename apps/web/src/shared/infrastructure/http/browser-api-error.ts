import { REQUEST_ID_HEADER, requestIdSchema, type RequestId } from "@futrob/api-contracts";
import { parseApiErrorBody, parseRetryAfterSeconds } from "@futrob/sdk";

export type BrowserApiError = Readonly<{
  code: string;
  requestId?: RequestId;
  retryAfterSeconds?: number;
}>;

export function readBrowserApiError(
  response: Response,
  raw: unknown,
  fallbackCode: string,
): BrowserApiError {
  const body = parseApiErrorBody(raw);
  const header = requestIdSchema.safeParse(response.headers.get(REQUEST_ID_HEADER));
  return {
    code: body?.code ?? fallbackCode,
    requestId: body?.requestId ?? (header.success ? header.data : undefined),
    retryAfterSeconds:
      body?.retryAfterSeconds ?? parseRetryAfterSeconds(response.headers.get("Retry-After")),
  };
}
