const REDACTED_AUDIT_TEXT = "[REDACTED]";

const EMAIL_PATTERN =
  /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/giu;
// A dot joins adjacent digits, but sentence punctuation and line breaks end the phone.
const INTERNATIONAL_PHONE_PATTERN =
  /\+\d(?:(?:[ \t]+|[ \t]*[()-][ \t]*|\.)?\d){6,14}(?!\d)(?:[ \t]*(?:x|ext\.?)[ \t]*\d+)?/giu;
const TEN_DIGIT_PHONE_PATTERN =
  /(?<!\d)(?:\(\d{3}\)[ .-]?|\d{3}[ .-])\d{3}[ .-]\d{4}(?!\d)(?:[ \t]*(?:x|ext\.?)[ \t]*\d+)?/giu;
const LOCAL_PHONE_PATTERN = /(?<!\d)\d{3}[.-]\d{4}(?!\d)(?:[ \t]*(?:x|ext\.?)[ \t]*\d+)?/giu;

/**
 * Audit reasons preserve their explanation while replacing email addresses and
 * plausible phone numbers with one literal marker. Dates, scores and plain text
 * are left alone.
 */
export function redactAuditReason(reason: string): string {
  return reason
    .replace(EMAIL_PATTERN, REDACTED_AUDIT_TEXT)
    .replace(INTERNATIONAL_PHONE_PATTERN, REDACTED_AUDIT_TEXT)
    .replace(TEN_DIGIT_PHONE_PATTERN, REDACTED_AUDIT_TEXT)
    .replace(LOCAL_PHONE_PATTERN, REDACTED_AUDIT_TEXT);
}

export function redactOptionalAuditReason(reason: string | null): string | null {
  return reason === null ? null : redactAuditReason(reason);
}
