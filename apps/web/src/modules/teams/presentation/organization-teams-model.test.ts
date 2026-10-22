import { describe, expect, it } from "vitest";
import type { CompetitionDto, CompetitionEntryDto, TeamDto } from "@futrob/api-contracts";
import {
  buildTeamParticipationIndex,
  filterTeamsByName,
  formatTeamCreatedAt,
} from "./organization-teams-model.ts";

function team(id: string, name: string): TeamDto {
  return { id, organizationId: "org-1", name, createdAt: "2026-10-03T12:00:00.000Z" };
}

function competition(id: string, name: string): CompetitionDto {
  return { id, name } as CompetitionDto;
}

function entry(
  competitionId: string,
  teamId: string,
  status: CompetitionEntryDto["status"],
): CompetitionEntryDto {
  return {
    id: `${competitionId}-${teamId}`,
    organizationId: "org-1",
    competitionId,
    teamId,
    status,
    createdAt: "2026-10-03T12:00:00.000Z",
  };
}

describe("filterTeamsByName", () => {
  const teams = [team("a", "Cuervos FC"), team("b", "Águilas del Sur"), team("c", "Lobos")];

  it("returns every team for a blank query", () => {
    expect(filterTeamsByName(teams, "   ")).toBe(teams);
  });

  it("ignores case and diacritics", () => {
    expect(filterTeamsByName(teams, "aguilas").map((item) => item.id)).toEqual(["b"]);
    expect(filterTeamsByName(teams, "CUERVOS").map((item) => item.id)).toEqual(["a"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterTeamsByName(teams, "zzz")).toEqual([]);
  });
});

describe("buildTeamParticipationIndex", () => {
  const competitions = [competition("liga", "Liga"), competition("copa", "Copa")];

  it("groups entries by team, approved first", () => {
    const index = buildTeamParticipationIndex(competitions, [
      { kind: "data", participants: [entry("liga", "t1", "pending")] },
      { kind: "data", participants: [entry("copa", "t1", "approved")] },
    ]);
    expect(index.complete).toBe(true);
    expect(index.byTeam.get("t1")).toEqual([
      { competitionId: "copa", competitionName: "Copa", status: "approved" },
      { competitionId: "liga", competitionName: "Liga", status: "pending" },
    ]);
    expect(index.byTeam.get("t2")).toBeUndefined();
  });

  it("is incomplete while a competition is loading or failed", () => {
    const loading = buildTeamParticipationIndex(competitions, [
      { kind: "data", participants: [entry("liga", "t1", "approved")] },
      { kind: "loading" },
    ]);
    const failed = buildTeamParticipationIndex(competitions, [
      { kind: "error" },
      { kind: "data", participants: [] },
    ]);
    expect(loading.complete).toBe(false);
    expect(loading.byTeam.get("t1")).toHaveLength(1);
    expect(failed.complete).toBe(false);
  });

  it("is incomplete when a competition's participants were refused", () => {
    const refused = buildTeamParticipationIndex(competitions, [
      { kind: "forbidden" },
      { kind: "data", participants: [] },
    ]);
    expect(refused.complete).toBe(false);
  });

  it("is incomplete when the competition list itself is unknown, even though it is empty", () => {
    expect(buildTeamParticipationIndex([], [], false).complete).toBe(false);
    expect(buildTeamParticipationIndex([], [], true).complete).toBe(true);
  });
});

describe("formatTeamCreatedAt", () => {
  it("formats in the requested locale on UTC", () => {
    expect(formatTeamCreatedAt("2026-10-03T23:30:00.000Z", "en")).toBe("Oct 3, 2026");
  });
});
