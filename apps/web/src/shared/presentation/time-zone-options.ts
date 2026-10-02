export interface TimeZoneOption {
  readonly value: string;
  readonly label: string;
}

const FALLBACK_TIME_ZONES = [
  "America/Lima",
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
  "America/Santiago",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Madrid",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

/** The browser's IANA zone, or `UTC` when the runtime cannot tell (SSR, old engines). */
export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function buildTimeZoneOptions(): readonly TimeZoneOption[] {
  let values: readonly string[] = FALLBACK_TIME_ZONES;
  try {
    if ("supportedValuesOf" in Intl) {
      values = Intl.supportedValuesOf("timeZone");
    }
  } catch {
    values = FALLBACK_TIME_ZONES;
  }
  return [...new Set(["UTC", getBrowserTimeZone(), ...values])].map((value) => ({
    value,
    label: value.replaceAll("_", " "),
  }));
}

/** `UTC`, the browser zone, then every zone the runtime supports. */
export const timeZoneOptions = buildTimeZoneOptions();
