import { describe, expect, it } from "vite-plus/test";
import type { CompetitionDto, TeamDto } from "@futrob/api-contracts";
import {
  countActiveCompetitions,
  countDraftCompetitions,
  recentOrganizationActivity,
  recentOrganizationCompetitions,
} from "./organization-home-model.ts";

function competition(
  overrides: Pick<CompetitionDto, "id" | "status" | "updatedAt"> & Partial<CompetitionDto>,
): CompetitionDto {
  return {
    organizationId: "org-1",
    name: overrides.id,
    modality: "fc-clubs",
    gameEdition: "FC 26",
    platform: "playstation",
    region: "south-america",
    timeZone: "America/Lima",
    format: "league",
    teams: { min: 2, max: null },
    schedule: { startsOn: null, endsOn: null },
    cover: { kind: "preset", preset: "league" },
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function team(overrides: Pick<TeamDto, "id" | "createdAt"> & Partial<TeamDto>): TeamDto {
  return {
    organizationId: "org-1",
    name: overrides.id,
    ...overrides,
  };
}

describe("organization home summary", () => {
  const competitions = [
    competition({ id: "active", status: "published", updatedAt: "2026-10-02T00:00:00.000Z" }),
    competition({ id: "open", status: "registration", updatedAt: "2026-10-01T00:00:00.000Z" }),
    competition({ id: "paused", status: "paused", updatedAt: "2026-09-01T00:00:00.000Z" }),
    competition({ id: "draft", status: "draft", updatedAt: "2026-10-04T00:00:00.000Z" }),
    competition({ id: "done", status: "finished", updatedAt: "2026-07-01T00:00:00.000Z" }),
    competition({ id: "old", status: "archived", updatedAt: "2026-06-01T00:00:00.000Z" }),
  ];

  it("counts active competitions separately from drafts and closed ones", () => {
    expect(countActiveCompetitions(competitions)).toBe(3);
    expect(countDraftCompetitions(competitions)).toBe(1);
    expect(countActiveCompetitions([])).toBe(0);
    expect(countDraftCompetitions([])).toBe(0);
  });

  it("lists the most recently updated competitions", () => {
    expect(recentOrganizationCompetitions(competitions, 2).map((item) => item.id)).toEqual([
      "draft",
      "active",
    ]);
  });

  it("merges competitions and teams by time without inventing an actor", () => {
    const teams = [team({ id: "cuervos", name: "Cuervos", createdAt: "2026-10-03T00:00:00.000Z" })];
    expect(recentOrganizationActivity(competitions, teams, 3)).toEqual([
      {
        kind: "competition",
        id: "draft",
        name: "draft",
        status: "draft",
        at: "2026-10-04T00:00:00.000Z",
      },
      {
        kind: "team",
        id: "cuervos",
        name: "Cuervos",
        at: "2026-10-03T00:00:00.000Z",
      },
      {
        kind: "competition",
        id: "active",
        name: "active",
        status: "published",
        at: "2026-10-02T00:00:00.000Z",
      },
    ]);
  });
});
