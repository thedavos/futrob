const REDACTED_AUDIT_TEXT = "[REDACTED]";

const EMAIL_PATTERN =
  /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/giu;
const INTERNATIONAL_PHONE_PATTERN = /\+\d(?:[\s().-]*\d){6,14}/gu;
const TEN_DIGIT_PHONE_PATTERN = /(?<!\w)(?:\(\d{3}\)[ .-]?|\d{3}[ .-])\d{3}[ .-]\d{4}\b/gu;
const LOCAL_PHONE_PATTERN = /\b\d{3}[.-]\d{4}\b/gu;

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
