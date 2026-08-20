import {
  apiErrorSchema,
  REQUEST_ID_HEADER,
  requestIdSchema,
  type RequestCorrelation,
  type RequestId,
} from "@futrob/api-contracts";
import { apiErrorResponse } from "@/shared/infrastructure/http/api-response.ts";

export type BffRequestLogEntry = Readonly<{
  event: "bff.request.completed" | "bff.request.failed";
  requestId: RequestId;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  errorName?: string;
}>;

interface BffRequestLogger {
  info(entry: BffRequestLogEntry): void;
  error(entry: BffRequestLogEntry): void;
}

const consoleBffRequestLogger: BffRequestLogger = {
  info(entry) {
    console.warn(JSON.stringify(entry));
  },
  error(entry) {
    console.error(JSON.stringify(entry));
  },
};

const requestCorrelations = new WeakMap<Request, RequestCorrelation>();

export function createBffRequestCorrelation(
  request: Request,
  generateRequestId: () => RequestId = () => crypto.randomUUID(),
): RequestCorrelation {
  const active = requestCorrelations.get(request);
  if (active) return active;
  const incoming = requestIdSchema.safeParse(request.headers.get(REQUEST_ID_HEADER));
  const correlation = { requestId: incoming.success ? incoming.data : generateRequestId() };
  requestCorrelations.set(request, correlation);
  return correlation;
}

export async function withBffRequestCorrelation(
  request: Request,
  handler: (correlation: RequestCorrelation) => Promise<Response>,
  options: Readonly<{
    generateRequestId?: () => RequestId;
    logger?: BffRequestLogger;
  }> = {},
): Promise<Response> {
  const correlation = createBffRequestCorrelation(request, options.generateRequestId);
  const startedAt = performance.now();
  const logger = options.logger ?? consoleBffRequestLogger;
  const path = new URL(request.url).pathname;

  let response: Response;
  try {
    response = await handler(correlation);
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    logger.error({
      event: "bff.request.failed",
      requestId: correlation.requestId,
      method: request.method,
      path,
      status: 500,
      durationMs: Math.round(performance.now() - startedAt),
      errorName,
    });
    response = apiErrorResponse(
      500,
      { code: "api.unexpected_error", messageKey: "errors.api.unexpected_error" },
      correlation.requestId,
    );
  }

  response = await correlateBffErrorBody(response, correlation.requestId);
  response.headers.set(REQUEST_ID_HEADER, correlation.requestId);
  logger.info({
    event: "bff.request.completed",
    requestId: correlation.requestId,
    method: request.method,
    path,
    status: response.status,
    durationMs: Math.round(performance.now() - startedAt),
  });
  return response;
}

async function correlateBffErrorBody(response: Response, requestId: RequestId): Promise<Response> {
  if (
    response.status < 400 ||
    !response.headers.get("content-type")?.includes("application/json")
  ) {
    return response;
  }

  const parsed = apiErrorSchema.safeParse(
    await response
      .clone()
      .json()
      .catch(() => null),
  );
  if (!parsed.success || parsed.data.requestId === requestId) return response;

  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify({ ...parsed.data, requestId }), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
