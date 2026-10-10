import { describe, expect, it } from "vite-plus/test";
import { timeZoneLabel, timeZoneOptions } from "./time-zone-options.ts";

describe("timeZoneLabel", () => {
  it("shows the city and a whole-hour offset", () => {
    expect(timeZoneLabel("America/Lima", new Date("2026-06-15T15:00:00Z"))).toBe("Lima · UTC-5");
    expect(timeZoneLabel("America/Argentina/Buenos_Aires", new Date("2026-06-15T15:00:00Z"))).toBe(
      "Buenos Aires · UTC-3",
    );
  });

  it("keeps UTC as UTC", () => {
    expect(timeZoneLabel("UTC", new Date("2026-06-15T15:00:00Z"))).toBe("UTC");
  });

  it("follows the date when the zone observes daylight saving", () => {
    expect(timeZoneLabel("America/New_York", new Date("2026-01-15T17:00:00Z"))).toBe(
      "New York · UTC-5",
    );
    expect(timeZoneLabel("America/New_York", new Date("2026-07-15T16:00:00Z"))).toBe(
      "New York · UTC-4",
    );
  });
});

describe("timeZoneOptions", () => {
  it("keeps the IANA id and shows the city label", () => {
    const lima = timeZoneOptions.find((zone) => zone.value === "America/Lima");
    expect(lima).toEqual({ value: "America/Lima", label: "Lima · UTC-5" });
  });
});
