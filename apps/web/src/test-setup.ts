import "@testing-library/jest-dom/vitest";

const testTimeZones = [
  "UTC",
  "America/Lima",
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
  "America/Santiago",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Madrid",
  "Asia/Tokyo",
] as const;

if ("supportedValuesOf" in Intl) {
  // SAFETY: test-only stub; the runtime always exposes supportedValuesOf in Node 24.
  Intl.supportedValuesOf = ((key: string) =>
    key === "timeZone" ? [...testTimeZones] : []) as typeof Intl.supportedValuesOf;
}
