import { describe, expect, it } from "vite-plus/test";
import { getMyMatchesQuerySchema, getMyStatisticsQuerySchema } from "./schemas.ts";

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
