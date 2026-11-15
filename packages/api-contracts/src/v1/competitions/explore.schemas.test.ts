import { describe, expect, it } from "vite-plus/test";
import { exploreCompetitionsQuerySchema } from "./schemas.ts";

describe("explore competitions contracts", () => {
  it("defaults sort and limit and drops empty filters", () => {
    expect(exploreCompetitionsQuerySchema.parse({ limit: "24" })).toEqual({
      sort: "updated-desc",
      limit: 24,
    });
    expect(
      exploreCompetitionsQuerySchema.parse({
        q: "",
        format: "",
        status: "",
        region: "",
        platform: "",
      }),
    ).toEqual({
      sort: "updated-desc",
      limit: 24,
    });
  });

  it("rejects a draft status and an oversized page", () => {
    expect(exploreCompetitionsQuerySchema.safeParse({ status: "draft" }).success).toBe(false);
    expect(exploreCompetitionsQuerySchema.safeParse({ limit: "49" }).success).toBe(false);
  });
});
