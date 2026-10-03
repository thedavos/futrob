import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import type { Competition } from "../../domain/entities/competition.ts";
import type {
  CompetitionDiscoveryFilter,
  CompetitionDiscoveryReader,
  DiscoverableCompetitionPage,
  DiscoverableCompetitionRecord,
} from "../../domain/ports/competition-discovery.reader.ts";
import { GetDiscoverableCompetitionUseCase } from "./get-discoverable-competition.use-case.ts";

class FakeDiscoveryReader implements CompetitionDiscoveryReader {
  constructor(private readonly record: DiscoverableCompetitionRecord | null) {}

  async list(_filter: CompetitionDiscoveryFilter): Promise<DiscoverableCompetitionPage> {
    return {
      items: this.record ? [this.record] : [],
      total: this.record ? 1 : 0,
      nextCursor: null,
    };
  }

  async findById(): Promise<DiscoverableCompetitionRecord | null> {
    return this.record;
  }
}

function published(): Competition {
  return {
    id: asCompetitionId("c-1"),
    organizationId: asOrganizationId("org-1"),
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
    createdByActorId: asActorId("actor-1"),
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-02T00:00:00.000Z"),
  };
}

describe("GetDiscoverableCompetitionUseCase", () => {
  it("returns the discoverable record", async () => {
    const competition = published();
    const result = await new GetDiscoverableCompetitionUseCase(
      new FakeDiscoveryReader({ competition, approvedTeamCount: 2 }),
    ).execute({ competitionId: asCompetitionId("c-1") });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.competition.name).toBe("Liga Norte");
    expect(result.value.approvedTeamCount).toBe(2);
  });

  it("returns not_discoverable when the reader finds nothing", async () => {
    const result = await new GetDiscoverableCompetitionUseCase(
      new FakeDiscoveryReader(null),
    ).execute({ competitionId: asCompetitionId("missing") });

    expect(result.isOk()).toBe(false);
    if (result.isOk()) return;
    expect(result.error.code).toBe("competitions.not_discoverable");
  });
});
