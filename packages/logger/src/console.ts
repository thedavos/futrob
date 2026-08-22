import { colorMethod, colorStatus, levelLabelColor, DIM, MAGENTA, RESET } from "./colors.ts";
import {
  logLevelEnabled,
  type AppLogger,
  type ConsoleLoggerOptions,
  type LogLevel,
  type LogFields,
} from "./types.ts";

function styledTimestamp(): string {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

type Write = (message: string) => void;

interface Emitter {
  readonly write: Write;
  readonly minLevel: LogLevel;
  readonly format: "styled" | "plain" | "json";
  readonly scope: string | null;
}

function eventLine(emitter: Emitter, level: LogLevel, event: string, fields: LogFields): string {
  const scope = emitter.scope ? `${emitter.scope}:` : "";
  const fullEvent = `${scope}${event}`;
  if (emitter.format === "json") {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event: fullEvent,
      ...Object.fromEntries(Object.entries(fields)),
    });
  }
  const stamp =
    emitter.format === "styled"
      ? `${DIM}[${styledTimestamp()}]${RESET} `
      : `[${styledTimestamp()}] `;
  if (emitter.format === "plain") {
    const fieldText =
      Object.keys(fields).length > 0
        ? ` ${Object.entries(fields)
            .map(([key, value]) => `${key}=${String(value)}`)
            .join(" ")}`
        : "";
    return `${stamp}[${level.toUpperCase()}] ${fullEvent}${fieldText}`;
  }
  const label = `${levelLabelColor(level)}${level.toUpperCase()}${RESET}`;
  const coloredEvent =
    level === "error" ? `${MAGENTA}${fullEvent}${RESET}` : `${MAGENTA}${fullEvent}${RESET}`;
  return `${stamp}${label} ${coloredEvent}`;
}

/** Compact access-log line for HTTP requests; verbs and statuses are colored. */
export function formatHttpAccessLog(input: {
  readonly format: "styled" | "plain" | "json";
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly durationMs: number;
  readonly requestId?: string;
}): string {
  const { format, method, path, status, durationMs, requestId } = input;
  if (format === "json") {
    const payload = {
      timestamp: new Date().toISOString(),
      level: "info",
      event: "http.request.completed",
      method,
      path,
      status,
      durationMs,
    };
    if (requestId !== undefined) {
      Object.assign(payload, { requestId });
    }
    return JSON.stringify(payload);
  }
  const stamp =
    format === "styled" ? `${DIM}[${styledTimestamp()}]${RESET} ` : `[${styledTimestamp()}] `;
  const verb = format === "styled" ? colorMethod(method).padEnd(16) : method.padEnd(7);
  const code = format === "styled" ? colorStatus(status).padEnd(11) + RESET : String(status);
  const duration = format === "styled" ? `${DIM}${durationMs}ms${RESET}` : `${durationMs}ms`;
  const id = requestId ? ` ${DIM}${requestId.slice(0, 8)}${RESET}` : "";
  return [stamp, verb, code, path, duration, id].filter(Boolean).join(" ");
}

export function createConsoleLogger(options: ConsoleLoggerOptions = {}): AppLogger {
  const emitter: Emitter = {
    write: (message) => console.info(message),
    minLevel: options.level ?? "info",
    format: options.format ?? "styled",
    scope: options.scope ?? null,
  };

  function emit(level: LogLevel, event: string, fields: LogFields = {}): void {
    if (!logLevelEnabled(emitter.minLevel, level)) return;
    const line = eventLine(emitter, level, event, fields);
    if (level === "error") {
      console.error(line);
      return;
    }
    if (level === "warn") {
      console.warn(line);
      return;
    }
    emitter.write(line);
  }

  function makeLogger(scope: string | null): AppLogger {
    return {
      debug: (event, fields) => emit("debug", event, fields),
      info: (event, fields) => emit("info", event, fields),
      warn: (event, fields) => emit("warn", event, fields),
      error: (event, fields) => emit("error", event, fields),
      child(extra: string): AppLogger {
        return makeLogger(scope ? `${scope}.${extra}` : extra);
      },
    };
  }

  const scoped = makeLogger(options.scope ?? null);
  return {
    ...scoped,
    child: (extra: string) => makeLogger(`${options.scope ? `${options.scope}.` : ""}${extra}`),
  };
}
