/** ANSI escape codes for terminal-styled logs. Never use on React Native. */
export const RESET = "\u001b[0m";
export const DIM = "\u001b[2m";
export const BOLD = "\u001b[1m";
export const RED = "\u001b[31m";
export const GREEN = "\u001b[32m";
export const YELLOW = "\u001b[33m";
export const MAGENTA = "\u001b[35m";
export const CYAN = "\u001b[36m";

const METHOD_COLORS = {
  GET: GREEN,
  POST: YELLOW,
  DELETE: RED,
  PUT: MAGENTA,
  PATCH: MAGENTA,
};

/** Colors an HTTP verb for access-log lines; unknown verbs stay unstyled. */
export function colorMethod(method: string): string {
  // SAFETY: the `in` check proves the key exists before this lookup.
  const color =
    method in METHOD_COLORS ? METHOD_COLORS[method as keyof typeof METHOD_COLORS] : undefined;
  return color ? `${color}${method}${RESET}` : method;
}

/** Colors an HTTP status by response class. */
export function colorStatus(status: number): string {
  if (status >= 500) return `${BOLD}${RED}`;
  if (status >= 400) return YELLOW;
  if (status >= 300) return MAGENTA;
  return GREEN;
}

export function levelLabelColor(level: "debug" | "info" | "warn" | "error"): string {
  switch (level) {
    case "error":
      return `${BOLD}${RED}`;
    case "warn":
      return YELLOW;
    case "debug":
      return DIM;
    case "info":
      return CYAN;
  }
}
