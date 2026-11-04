import { describe, expect, it } from "vite-plus/test";
import { competitionTeamManagementListQuerySchema } from "./schemas.ts";

describe("competition team management contracts", () => {
  it("parses a stable bounded page query", () => {
    expect(competitionTeamManagementListQuerySchema.parse({ limit: "25" })).toEqual({
      limit: 25,
    });
    expect(() => competitionTeamManagementListQuerySchema.parse({ limit: "51" })).toThrow();
  });
});
