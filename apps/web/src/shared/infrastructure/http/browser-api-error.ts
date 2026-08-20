import { REQUEST_ID_HEADER, requestIdSchema, type RequestId } from "@futrob/api-contracts";
import { parseApiErrorBody, parseRetryAfterSeconds, httpResponseBodySchema } from "@futrob/sdk";
import { z } from "zod";

export type BrowserApiError = Readonly<{
  code: string;
  requestId?: RequestId;
  retryAfterSeconds?: number;
}>;

const responseBodySchema = z.unknown();

export type UnparsedResponseBody = z.infer<typeof responseBodySchema>;

export function readBrowserApiError(
  response: Response,
  raw: UnparsedResponseBody,
  fallbackCode: string,
): BrowserApiError {
  const parsedBody = httpResponseBodySchema.safeParse(raw);
  const body = parseApiErrorBody(parsedBody.success ? parsedBody.data : null);
  const header = requestIdSchema.safeParse(response.headers.get(REQUEST_ID_HEADER));
  return {
    code: body?.code ?? fallbackCode,
    requestId: body?.requestId ?? (header.success ? header.data : undefined),
    retryAfterSeconds:
      body?.retryAfterSeconds ?? parseRetryAfterSeconds(response.headers.get("Retry-After")),
  };
}
