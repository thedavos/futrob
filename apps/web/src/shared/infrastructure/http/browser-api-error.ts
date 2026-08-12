import { REQUEST_ID_HEADER, requestIdSchema, type RequestId } from "@futrob/api-contracts";
import { parseApiErrorBody } from "@futrob/sdk";

export type BrowserApiError = Readonly<{
  code: string;
  requestId?: RequestId;
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
  };
}
