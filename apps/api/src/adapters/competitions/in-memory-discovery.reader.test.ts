import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { Competition, CompetitionDraft } from "@futrob/competitions";
import { InMemoryCompetitionEntryRepository } from "./competition-entry.repositories.ts";
import { InMemoryCompetitionDiscoveryReader } from "./in-memory-discovery.reader.ts";
import { InMemoryCompetitionRepository } from "./in-memory.repository.ts";

function draft(
  patch: Partial<Competition> & Pick<Competition, "id" | "name" | "status" | "updatedAt">,
): CompetitionDraft {
  const competition: Competition = {
    organizationId: asOrganizationId("org-1"),
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
    ...patch,
  };
  return {
    competition,
    rules: {
      competitionId: competition.id,
      version: 1,
      regularStage: null,
      knockoutStage: null,
      awayGoalsEnabled: false,
      maxRosterSize: null,
      createdAt: competition.createdAt,
    },
  };
}

async function seedReader() {
  const competitions = new InMemoryCompetitionRepository();
  const entries = new InMemoryCompetitionEntryRepository();
  await competitions.saveDraft(
    draft({
      id: asCompetitionId("c-draft"),
      name: "Borrador",
      status: "draft",
      updatedAt: new Date("2026-08-10T00:00:00.000Z"),
    }),
  );
  await competitions.saveDraft(
    draft({
      id: asCompetitionId("c-archived"),
      name: "Archivada",
      status: "archived",
      updatedAt: new Date("2026-08-11T00:00:00.000Z"),
    }),
  );
  await competitions.saveDraft(
    draft({
      id: asCompetitionId("c-league"),
      name: "Liga Norte",
      status: "published",
      updatedAt: new Date("2026-08-08T00:00:00.000Z"),
    }),
  );
  await competitions.saveDraft(
    draft({
      id: asCompetitionId("c-cup"),
      name: "Copa Sur",
      status: "paused",
      format: "knockout",
      region: "south-america",
      platform: "pc",
      updatedAt: new Date("2026-08-09T00:00:00.000Z"),
    }),
  );
  await competitions.saveDraft(
    draft({
      id: asCompetitionId("c-done"),
      name: "Liga Vieja",
      status: "finished",
      updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    }),
  );
  await entries.save({
    id: "entry-1",
    organizationId: asOrganizationId("org-1"),
    competitionId: asCompetitionId("c-league"),
    teamId: asTeamId("team-1"),
    status: "approved",
    createdAt: new Date("2026-08-08T00:00:00.000Z"),
    creationKey: null,
  });
  await entries.save({
    id: "entry-2",
    organizationId: asOrganizationId("org-1"),
    competitionId: asCompetitionId("c-league"),
    teamId: asTeamId("team-2"),
    status: "pending",
    createdAt: new Date("2026-08-08T00:00:00.000Z"),
    creationKey: null,
  });
  await entries.save({
    id: "entry-foreign",
    organizationId: asOrganizationId("org-other"),
    competitionId: asCompetitionId("c-league"),
    teamId: asTeamId("team-foreign"),
    status: "approved",
    createdAt: new Date("2026-08-08T00:00:00.000Z"),
    creationKey: null,
  });
  return new InMemoryCompetitionDiscoveryReader(competitions, entries);
}

describe("InMemoryCompetitionDiscoveryReader", () => {
  it("excludes drafts and archives and counts only approved teams", async () => {
    const reader = await seedReader();
    const page = await reader.list({ sort: "updated-desc", limit: 24 });

    expect(page.total).toBe(3);
    expect(page.items.map((item) => item.competition.id)).toEqual(["c-cup", "c-league", "c-done"]);
    expect(page.items.find((item) => item.competition.id === "c-league")?.approvedTeamCount).toBe(
      1,
    );
  });

  it("applies name, format, status, region and platform filters", async () => {
    const reader = await seedReader();
    const byName = await reader.list({ q: "norte", sort: "updated-desc", limit: 24 });
    expect(byName.items.map((item) => item.competition.name)).toEqual(["Liga Norte"]);

    const byFormat = await reader.list({ format: "knockout", sort: "updated-desc", limit: 24 });
    expect(byFormat.items.map((item) => item.competition.id)).toEqual(["c-cup"]);

    const byStatus = await reader.list({ status: "finished", sort: "updated-desc", limit: 24 });
    expect(byStatus.items.map((item) => item.competition.id)).toEqual(["c-done"]);

    const byRegion = await reader.list({
      region: "south-america",
      sort: "updated-desc",
      limit: 24,
    });
    expect(byRegion.items.map((item) => item.competition.id)).toEqual(["c-cup"]);

    const byPlatform = await reader.list({ platform: "pc", sort: "updated-desc", limit: 24 });
    expect(byPlatform.items.map((item) => item.competition.id)).toEqual(["c-cup"]);
  });

  it("pages with a cursor and hides unpublished ids", async () => {
    const reader = await seedReader();
    const first = await reader.list({ sort: "updated-desc", limit: 1 });
    expect(first.items[0]?.competition.id).toBe("c-cup");
    expect(first.nextCursor).toEqual(expect.any(String));

    const second = await reader.list({
      sort: "updated-desc",
      limit: 1,
      cursor: first.nextCursor ?? undefined,
    });
    expect(second.items[0]?.competition.id).toBe("c-league");

    expect(await reader.findById(asCompetitionId("c-draft"))).toBeNull();
    expect((await reader.findById(asCompetitionId("c-league")))?.competition.name).toBe(
      "Liga Norte",
    );
  });
});
