import { createMiddleware } from "hono/factory";
import { REQUEST_ID_HEADER } from "@futrob/api-contracts";
import {
  createRequestCorrelation,
  logCorrelatedInfo,
  runWithRequestCorrelation,
  type CorrelationLogger,
} from "@/context/request-correlation.ts";

export function createRequestCorrelationMiddleware(logger: CorrelationLogger) {
  return createMiddleware(async (c, next) => {
    const correlation = createRequestCorrelation(c.req.header(REQUEST_ID_HEADER));
    return runWithRequestCorrelation(correlation, logger, async () => {
      const startedAt = performance.now();
      c.header(REQUEST_ID_HEADER, correlation.requestId);
      try {
        await next();
      } finally {
        logCorrelatedInfo("http.request.completed", {
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          durationMs: Math.round(performance.now() - startedAt),
        });
      }
    });
  });
}
