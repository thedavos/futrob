import { describe, expect, it } from "vite-plus/test";
import { competitionCoverSchema, updateCompetitionDraftRequestSchema } from "./schemas.ts";

describe("competition profile contracts", () => {
  it("accepts known presets and uploads, rejects unknown presets", () => {
    expect(competitionCoverSchema.safeParse({ kind: "preset", preset: "league" }).success).toBe(
      true,
    );
    expect(
      competitionCoverSchema.safeParse({ kind: "upload", key: "competition-covers/o/k.png" })
        .success,
    ).toBe(true);
    expect(competitionCoverSchema.safeParse({ kind: "preset", preset: "unknown" }).success).toBe(
      false,
    );
  });

  it("rejects a non-calendar date string before it reaches the domain", () => {
    const base = {
      name: "Liga",
      gameEdition: "FC 26",
      platform: "pc",
      region: "america",
      timeZone: "UTC",
      format: "league",
      rules: { regularStage: null, knockoutStage: null, maxRosterSize: null },
    };
    const parse = (startsOn: string) =>
      updateCompetitionDraftRequestSchema.safeParse({
        ...base,
        schedule: { startsOn, endsOn: null },
      }).success;
    expect([parse("2026-10-12"), parse("12/10/2026")]).toEqual([true, false]);
  });
});
