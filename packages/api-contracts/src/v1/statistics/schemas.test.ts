import { describe, expect, it } from "vite-plus/test";
import {
  competitionStandingRowSchema,
  getMyMatchesQuerySchema,
  getMyStatisticsQuerySchema,
} from "./schemas.ts";

describe("personal statistics query schemas", () => {
  it("accepts the same scope-reducing filters for statistics and matches", () => {
    const filters = {
      competitionId: "competition-1",
      teamId: "team-1",
      gameEdition: "fc26",
      platform: "playstation",
      position: "midfielder",
    };

    expect(getMyStatisticsQuerySchema.parse(filters)).toEqual(filters);
    expect(getMyMatchesQuerySchema.parse({ ...filters, limit: "25" })).toEqual({
      ...filters,
      limit: 25,
    });
  });

  it.each([getMyStatisticsQuerySchema, getMyMatchesQuerySchema])(
    "rejects empty filter values",
    (schema) => {
      expect(schema.safeParse({ teamId: "" }).success).toBe(false);
      expect(schema.safeParse({ gameEdition: " " }).success).toBe(false);
      expect(schema.safeParse({ platform: "" }).success).toBe(false);
      expect(schema.safeParse({ position: " " }).success).toBe(false);
    },
  );

  it("rejects invalid match pagination", () => {
    expect(getMyMatchesQuerySchema.safeParse({ limit: "not-a-number" }).success).toBe(false);
    expect(getMyMatchesQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });
});

describe("Swiss standings", () => {
  it("accepts negative opponent points in Buchholz after a sanction", () => {
    expect(
      competitionStandingRowSchema.parse({
        position: 1,
        teamId: "team-1",
        played: 1,
        wins: 1,
        draws: 0,
        losses: 0,
        goalsFor: 1,
        goalsAgainst: 0,
        goalDifference: 1,
        points: 3,
        form: ["win"],
        swiss: { buchholz: -3, byes: 0, withdrawn: false },
      }).swiss?.buchholz,
    ).toBe(-3);
  });
});
