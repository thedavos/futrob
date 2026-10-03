import { describe, expect, it, vi } from "vite-plus/test";
import {
  GetDiscoverableCompetitionUseCase,
  ListDiscoverableCompetitionsUseCase,
  type DiscoverableCompetitionRecord,
} from "@futrob/competitions";
import { parseOrganizationSlug } from "@futrob/organizations";
import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import { InMemoryOrganizationRepository } from "@/adapters/organizations/in-memory.repository.ts";
import { ExploreCompetitionsQuery } from "./explore-competitions.query.ts";

function record(id: string, organizationId: string): DiscoverableCompetitionRecord {
  return {
    approvedTeamCount: 0,
    competition: {
      id: asCompetitionId(id),
      organizationId: asOrganizationId(organizationId),
      name: id,
      status: "published",
      modality: "fc-clubs",
      gameEdition: "fc26",
      platform: "pc",
      region: "america",
      timeZone: "America/Lima",
      format: "league",
      teams: { min: 2, max: null },
      schedule: { startsOn: null, endsOn: null },
      cover: { kind: "preset", preset: "cup" },
      createdByActorId: asActorId("actor"),
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
  };
}

function harness(items: readonly DiscoverableCompetitionRecord[]) {
  const discovery = {
    list: async () => ({ items, total: items.length, nextCursor: null }),
    findById: async () => items[0] ?? null,
  };
  const organizations = new InMemoryOrganizationRepository();
  const query = new ExploreCompetitionsQuery({
    list: new ListDiscoverableCompetitionsUseCase(discovery),
    get: new GetDiscoverableCompetitionUseCase(discovery),
    organizations,
  });
  return { query, organizations };
}

describe("ExploreCompetitionsQuery", () => {
  it("fetches unique organization ids once per page, preserving order and fallback names", async () => {
    const { query, organizations } = harness([
      record("a", "org-1"),
      record("b", "org-1"),
      record("c", "missing"),
    ]);
    const slug = parseOrganizationSlug("league");
    if (!slug) throw new Error("fixture slug must be valid");
    await organizations.create({
      id: asOrganizationId("org-1"),
      name: "League",
      normalizedName: "league",
      slug,
      timeZone: "UTC",
      logo: { kind: "monogram" },
      createdAt: new Date(0),
      createdByActorId: asActorId("actor"),
    });
    const batch = vi.spyOn(organizations, "getByIds");
    const individual = vi.spyOn(organizations, "getById");
    const page = await query.list({ sort: "name-asc", limit: 24 });
    expect(page.items.map((item) => item.organization.name)).toEqual([
      "League",
      "League",
      "missing",
    ]);
    expect(batch).toHaveBeenCalledExactlyOnceWith(["org-1", "missing"]);
    expect(individual).not.toHaveBeenCalled();
  });

  it("does not query organizations for an empty page", async () => {
    const { query, organizations } = harness([]);
    const batch = vi.spyOn(organizations, "getByIds");
    expect(await query.list({ sort: "name-asc", limit: 24 })).toEqual({
      items: [],
      total: 0,
      nextCursor: null,
    });
    expect(batch).not.toHaveBeenCalled();
  });
});
