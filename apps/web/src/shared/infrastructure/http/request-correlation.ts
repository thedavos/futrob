import {
  REQUEST_ID_HEADER,
  requestIdSchema,
  type RequestCorrelation,
  type RequestId,
} from "@futrob/api-contracts";

type BffRequestLogEntry = Readonly<{
  event: "bff.request.completed";
  requestId: RequestId;
  method: string;
  path: string;
  status: number;
  durationMs: number;
}>;

interface BffRequestLogger {
  info(entry: BffRequestLogEntry): void;
}

const consoleBffRequestLogger: BffRequestLogger = {
  info(entry) {
    console.warn(JSON.stringify(entry));
  },
};

export function createBffRequestCorrelation(
  request: Request,
  generateRequestId: () => RequestId = () => crypto.randomUUID(),
): RequestCorrelation {
  const incoming = requestIdSchema.safeParse(request.headers.get(REQUEST_ID_HEADER));
  return { requestId: incoming.success ? incoming.data : generateRequestId() };
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
  const response = await handler(correlation);
  response.headers.set(REQUEST_ID_HEADER, correlation.requestId);
  (options.logger ?? consoleBffRequestLogger).info({
    event: "bff.request.completed",
    requestId: correlation.requestId,
    method: request.method,
    path: new URL(request.url).pathname,
    status: response.status,
    durationMs: Math.round(performance.now() - startedAt),
  });
  return response;
}
