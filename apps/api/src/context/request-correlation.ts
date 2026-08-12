import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { requestIdSchema, type RequestCorrelation } from "@futrob/api-contracts";

export type CorrelationLogEntry = Readonly<
  RequestCorrelation & {
    event: string;
    [key: string]: unknown;
  }
>;

export interface CorrelationLogger {
  info(entry: CorrelationLogEntry): void;
  error(entry: CorrelationLogEntry): void;
}

type RequestCorrelationContext = Readonly<{
  correlation: RequestCorrelation;
  logger: CorrelationLogger;
}>;

const requestCorrelationStorage = new AsyncLocalStorage<RequestCorrelationContext>();

export function createRequestCorrelation(candidate?: string | null): RequestCorrelation {
  const parsed = requestIdSchema.safeParse(candidate);
  return { requestId: parsed.success ? parsed.data : randomUUID() };
}

export function runWithRequestCorrelation<T>(
  correlation: RequestCorrelation,
  logger: CorrelationLogger,
  operation: () => T,
): T {
  return requestCorrelationStorage.run({ correlation, logger }, operation);
}

export function currentRequestCorrelation(): RequestCorrelation | undefined {
  return requestCorrelationStorage.getStore()?.correlation;
}

export function logCorrelatedInfo(event: string, fields: Readonly<Record<string, unknown>> = {}) {
  const context = requestCorrelationStorage.getStore();
  if (!context) return;
  context.logger.info({ ...fields, event, requestId: context.correlation.requestId });
}

export function logCorrelatedError(event: string, fields: Readonly<Record<string, unknown>> = {}) {
  const context = requestCorrelationStorage.getStore();
  if (!context) return;
  context.logger.error({ ...fields, event, requestId: context.correlation.requestId });
}

export const consoleCorrelationLogger: CorrelationLogger = {
  info(entry) {
    console.info(JSON.stringify(entry));
  },
  error(entry) {
    console.error(JSON.stringify(entry));
  },
};
