import { describe, expect, it } from "vite-plus/test";
import {
  DEFAULT_PROFILE_FIELDS,
  toTeamsAndSchedule,
  validateCompetitionProfileFields,
} from "./competition-profile-fields-value.ts";

const field = (patch: Partial<typeof DEFAULT_PROFILE_FIELDS>) =>
  validateCompetitionProfileFields({ ...DEFAULT_PROFILE_FIELDS, ...patch })?.field ?? "valid";

describe("competition profile fields", () => {
  it("points each invalid input at the field that must change", () => {
    expect([
      field({}),
      field({ minTeams: "1" }),
      field({ minTeams: "4", maxTeams: "3" }),
      field({ maxTeams: "300" }),
      field({ startsOn: "2026-12-20", endsOn: "2026-10-12" }),
      field({ cover: { kind: "file", file: new File(["x"], "a.gif", { type: "image/gif" }) } }),
    ]).toEqual(["valid", "min-teams", "max-teams", "max-teams", "end-date", "cover"]);
  });

  it("explains the fix for a reversed team range", () => {
    expect(
      validateCompetitionProfileFields({ ...DEFAULT_PROFILE_FIELDS, minTeams: "8", maxTeams: "4" }),
    ).toEqual({
      field: "max-teams",
      message: "El máximo debe ser igual o mayor que el mínimo.",
    });
  });

  it("turns empty optional inputs into nulls for the request", () => {
    expect(
      toTeamsAndSchedule({ ...DEFAULT_PROFILE_FIELDS, minTeams: " 4 ", startsOn: "2026-10-12" }),
    ).toEqual({
      teams: { min: 4, max: null },
      schedule: { startsOn: "2026-10-12", endsOn: null },
    });
  });
});
