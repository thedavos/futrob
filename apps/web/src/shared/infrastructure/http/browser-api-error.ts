import { REQUEST_ID_HEADER, requestIdSchema, type RequestId } from "@futrob/api-contracts";
import { parseApiErrorBody } from "@futrob/sdk";

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
      body?.retryAfterSeconds ?? parseRetryAfter(response.headers.get("Retry-After")),
  };
}

function parseRetryAfter(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const seconds = Number(raw);
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : undefined;
}
