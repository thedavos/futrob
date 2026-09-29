import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import type { Competition } from "../../domain/entities/competition.ts";
import type {
  CompetitionDiscoveryFilter,
  CompetitionDiscoveryReader,
  DiscoverableCompetitionPage,
  DiscoverableCompetitionRecord,
} from "../../domain/ports/competition-discovery.reader.ts";
import { ListDiscoverableCompetitionsUseCase } from "./list-discoverable-competitions.use-case.ts";

class FakeDiscoveryReader implements CompetitionDiscoveryReader {
  constructor(private readonly page: DiscoverableCompetitionPage) {}

  async list(_filter: CompetitionDiscoveryFilter): Promise<DiscoverableCompetitionPage> {
    return this.page;
  }

  async findById(): Promise<DiscoverableCompetitionRecord | null> {
    return this.page.items[0] ?? null;
  }
}

function published(name: string): Competition {
  return {
    id: asCompetitionId("c-1"),
    organizationId: asOrganizationId("org-1"),
    name,
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
    createdByActorId: asActorId("actor-1"),
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-02T00:00:00.000Z"),
  };
}

describe("ListDiscoverableCompetitionsUseCase", () => {
  it("returns the discoverable page from the reader", async () => {
    const competition = published("Liga Norte");
    const listed = await new ListDiscoverableCompetitionsUseCase(
      new FakeDiscoveryReader({
        items: [{ competition, approvedTeamCount: 4 }],
        total: 1,
        nextCursor: null,
      }),
    ).execute({
      sort: "updated-desc",
      limit: 24,
    });

    expect(listed).toEqual({
      items: [{ competition, approvedTeamCount: 4 }],
      total: 1,
      nextCursor: null,
    });
  });
});
