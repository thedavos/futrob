/**
 * Mobile auth log policy: never emit bearer tokens, invitation tokens, or
 * session credentials. Apply this hook at any future logger sink.
 */
const SENSITIVE_KEY = /token|authorization|bearer|secret|password|invitation/i;

export type AuthLogFields = Readonly<Record<string, string | number | boolean | null>>;

export function redactSensitiveAuthFields(fields: AuthLogFields): AuthLogFields {
  const redacted: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    redacted[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : value;
  }
  return redacted;
}
