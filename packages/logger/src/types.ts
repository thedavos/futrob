export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
} as const satisfies Record<LogLevel, number>;

/** Structured fields attached to a log event. Keep values transport-safe. */
export type LogFields = Readonly<Record<string, string | number | boolean | null>>;

/**
 * Runtime-agnostic application logger. Implementations decide the sink:
 * styled/plain/json console for Node, CLI and Workers; a native bridge
 * (e.g. Metro pretty-logs plain strings) on React Native.
 */
export interface AppLogger {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
  /** Returns a logger that prefixes every event with `scope:`. */
  child(scope: string): AppLogger;
}

export interface ConsoleLoggerOptions {
  /** styled = ANSI colors (terminals); plain = no escapes (RN); json = machine. */
  readonly format?: "styled" | "plain" | "json";
  /** Minimum level to emit. Defaults to "info". */
  readonly level?: LogLevel;
  /** Prefix prepended to every event, e.g. "api:http". */
  readonly scope?: string;
}

export function logLevelEnabled(minimum: LogLevel, level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minimum];
}
