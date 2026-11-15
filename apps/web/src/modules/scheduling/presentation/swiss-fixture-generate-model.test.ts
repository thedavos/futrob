import { describe, expect, it } from "vite-plus/test";
import { swissGenerateDefaults, validateSwissGenerate } from "./swiss-fixture-generate-model.ts";

const context = { timeZone: "America/Lima", teamCount: 8 };
const now = new Date("2026-11-06T12:00:00.000Z");

describe("swissGenerateDefaults", () => {
  it("starts at seven days between rounds and ⌈log₂ n⌉ rounds", () => {
    expect(swissGenerateDefaults(8)).toEqual({ startsAt: "", intervalDays: "7", rounds: "3" });
    expect(swissGenerateDefaults(9).rounds).toBe("4");
    expect(swissGenerateDefaults(2).rounds).toBe("1");
  });
});

describe("validateSwissGenerate", () => {
  const valid = { startsAt: "2026-12-01T20:00", intervalDays: "7", rounds: "4" };

  it("reads the start in the competition time zone and sends a replayable first version", () => {
    expect(validateSwissGenerate(valid, context, now)).toEqual({
      ok: true,
      request: {
        generationVersion: 1,
        startsAt: "2026-12-02T01:00:00.000Z",
        roundIntervalDays: 7,
        homeAndAway: false,
        swiss: { rounds: 4 },
      },
    });
  });

  it("asks for the same request when the same values are sent twice", () => {
    expect(validateSwissGenerate(valid, context, now)).toEqual(
      validateSwissGenerate(valid, context, now),
    );
  });

  it("refuses a missing or past start", () => {
    for (const startsAt of ["", "2026-01-01T20:00", "mañana"]) {
      expect(validateSwissGenerate({ ...valid, startsAt }, context, now)).toEqual({
        ok: false,
        invalid: ["startsAt"],
      });
    }
  });

  it("refuses rounds beyond ⌊(n + 1) / 2⌋", () => {
    for (const rounds of ["0", "5", "2.5", ""]) {
      expect(validateSwissGenerate({ ...valid, rounds }, context, now)).toEqual({
        ok: false,
        invalid: ["rounds"],
      });
    }
    expect(validateSwissGenerate(valid, { ...context, teamCount: 7 }, now).ok).toBe(true);
  });

  it("refuses a cadence below one whole day and reports every field at once", () => {
    expect(
      validateSwissGenerate({ startsAt: "", intervalDays: "0", rounds: "9" }, context, now),
    ).toEqual({ ok: false, invalid: ["startsAt", "intervalDays", "rounds"] });
  });
});
