import { describe, expect, it } from "vite-plus/test";
import { exploreCompetitionsQuerySchema, exploreCompetitionsResponseSchema } from "./schemas.ts";

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

  it("parses a discoverable page item", () => {
    const page = exploreCompetitionsResponseSchema.parse({
      items: [
        {
          competition: {
            id: "c-1",
            organizationId: "org-1",
            name: "Liga Norte",
            status: "published",
            modality: "fc-clubs",
            gameEdition: "FC 26",
            platform: "playstation",
            region: "america",
            timeZone: "America/Lima",
            format: "league",
            teams: { min: 2, max: null },
            schedule: { startsOn: null, endsOn: null },
            cover: { kind: "preset", preset: "cup" },
            createdAt: "2026-08-01T00:00:00.000Z",
            updatedAt: "2026-08-02T00:00:00.000Z",
          },
          organization: { id: "org-1", name: "Liga Andina" },
          approvedTeamCount: 3,
        },
      ],
      total: 3,
      nextCursor: "cursor-2",
    });

    expect(page.items[0]?.organization.name).toBe("Liga Andina");
    expect(page.items[0]?.approvedTeamCount).toBe(3);
    expect(page.nextCursor).toBe("cursor-2");
  });
});
