import { createConsoleLogger, formatHttpAccessLog } from "@futrob/logger";
import { z } from "zod";
import type { CorrelationLogger, CorrelationLogEntry } from "@/context/request-correlation.ts";

/**
 * Correlation-aware logger backed by the shared `@futrob/logger` package.
 * Set LOG_FORMAT=json for machine-parseable output (default: styled ANSI).
 */

const logFormatSchema = z.union([z.literal("json"), z.literal("styled")]);

export function resolveApiLogFormat(): "json" | "styled" {
  const parsed = logFormatSchema.safeParse(process.env.LOG_FORMAT);
  return parsed.success ? parsed.data : "styled";
}

const baseLogger = createConsoleLogger({ format: resolveApiLogFormat(), scope: "api" });

const accessLogEntrySchema = z.object({
  event: z.literal("http.request.completed"),
  method: z.string(),
  path: z.string(),
  status: z.number(),
  durationMs: z.number(),
  requestId: z.string(),
});

/** Renders http.request.completed as a compact colored access-log line. */
function renderAccessLog(entry: CorrelationLogEntry): string | null {
  const parsed = accessLogEntrySchema.safeParse(entry);
  if (!parsed.success) return null;
  const { method, path, status, durationMs, requestId } = parsed.data;
  const format = resolveApiLogFormat();
  return formatHttpAccessLog({ format, method, path, status, durationMs, requestId });
}

export const styledConsoleCorrelationLogger: CorrelationLogger = {
  info(entry) {
    const accessLine = renderAccessLog(entry);
    if (accessLine) {
      baseLogger.info(accessLine);
      return;
    }
    baseLogger.info(
      entry.event,
      Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "event")),
    );
  },
  error(entry) {
    baseLogger.error(
      entry.event,
      Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "event")),
    );
  },
};

export function shouldUseJsonLogs(): boolean {
  return resolveApiLogFormat() === "json";
}
