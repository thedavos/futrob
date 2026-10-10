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

function timeZoneCity(timeZone: string): string {
  if (timeZone === "UTC") return "UTC";
  const city = timeZone.split("/").at(-1) ?? timeZone;
  return city.replaceAll("_", " ");
}

/** `GMT-5` and `GMT-05:00` become `UTC-5`. A whole hour drops the minutes. */
function utcOffsetLabel(timeZone: string, now: Date): string | null {
  try {
    const raw =
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        timeZoneName: "shortOffset",
        hour: "numeric",
      })
        .formatToParts(now)
        .find((part) => part.type === "timeZoneName")?.value ?? "";
    if (raw === "GMT" || raw === "UTC") return "UTC";
    const match = /^(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(raw);
    if (!match) return null;
    const hours = String(Number(match[2]));
    const minutes = match[3] && match[3] !== "00" ? `:${match[3]}` : "";
    return `UTC${match[1]}${hours}${minutes}`;
  } catch {
    return null;
  }
}

/** Visible zone name. The stored value stays the IANA id. The offset follows `now`. */
export function timeZoneLabel(timeZone: string, now = new Date()): string {
  const city = timeZoneCity(timeZone);
  if (city === "UTC") return "UTC";
  const offset = utcOffsetLabel(timeZone, now);
  return offset ? `${city} · ${offset}` : city;
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
    label: timeZoneLabel(value),
  }));
}

/** `UTC`, the browser zone, then every zone the runtime supports. */
export const timeZoneOptions = buildTimeZoneOptions();
