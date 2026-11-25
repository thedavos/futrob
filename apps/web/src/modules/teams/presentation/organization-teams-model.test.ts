import { describe, expect, it } from "vite-plus/test";
import type { CompetitionDto, CompetitionEntryDto, TeamDto } from "@futrob/api-contracts";
import {
  buildTeamParticipationIndex,
  filterOrganizationTeams,
  filterTeamsByName,
  formatTeamCreatedAt,
  getParticipationFilterReadiness,
  summarizeOrganizationTeams,
  summarizeTeamStatus,
  teamInitials,
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

  it("groups entries by team, pending first then approved", () => {
    const index = buildTeamParticipationIndex(competitions, [
      { kind: "data", participants: [entry("liga", "t1", "pending")] },
      { kind: "data", participants: [entry("copa", "t1", "approved")] },
    ]);
    expect(index.complete).toBe(true);
    expect(index.byTeam.get("t1")).toEqual([
      { competitionId: "liga", competitionName: "Liga", status: "pending" },
      { competitionId: "copa", competitionName: "Copa", status: "approved" },
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

describe("filterOrganizationTeams", () => {
  const teams = [
    team("pumas", "Atlético Pumas"),
    team("condores", "Cóndores FC"),
    team("sin-liga", "Sin Liga CF"),
  ];
  const competitions = [competition("liga", "Liga"), competition("copa", "Copa")];
  const completeIndex = buildTeamParticipationIndex(competitions, [
    {
      kind: "data",
      participants: [entry("liga", "pumas", "approved"), entry("liga", "condores", "pending")],
    },
    {
      kind: "data",
      participants: [entry("copa", "pumas", "approved")],
    },
  ]);

  it("filters by pending status", () => {
    const result = filterOrganizationTeams(
      teams,
      { query: "", status: "pending", competitionId: "all" },
      completeIndex,
    );
    expect(result.map((item) => item.id)).toEqual(["condores"]);
  });

  it("filters teams without competitions only when index is complete", () => {
    const completeResult = filterOrganizationTeams(
      teams,
      { query: "", status: "none", competitionId: "all" },
      completeIndex,
    );
    expect(completeResult.map((item) => item.id)).toEqual(["sin-liga"]);

    const incompleteIndex = buildTeamParticipationIndex(competitions, [
      { kind: "data", participants: [entry("liga", "pumas", "approved")] },
      { kind: "error" },
    ]);
    const incompleteResult = filterOrganizationTeams(
      teams,
      { query: "", status: "none", competitionId: "all" },
      incompleteIndex,
    );
    expect(incompleteResult).toEqual([]);
  });

  it("combines competition and name filters", () => {
    const result = filterOrganizationTeams(
      teams,
      { query: "pumas", status: "all", competitionId: "copa" },
      completeIndex,
    );
    expect(result.map((item) => item.id)).toEqual(["pumas"]);
  });

  it("checks pending status against the selected competition entry only", () => {
    const crossTeams = [
      team("cross", "Aprobado en Copa, Pendiente en Liga"),
      team("real", "Pendiente en Copa"),
    ];
    const crossIndex = buildTeamParticipationIndex(competitions, [
      { kind: "data", participants: [entry("liga", "cross", "pending")] },
      {
        kind: "data",
        participants: [entry("copa", "cross", "approved"), entry("copa", "real", "pending")],
      },
    ]);
    const result = filterOrganizationTeams(
      crossTeams,
      { query: "", status: "pending", competitionId: "copa" },
      crossIndex,
    );
    expect(result.map((item) => item.id)).toEqual(["real"]);
  });
});

describe("summarizeOrganizationTeams", () => {
  const teams = [team("a", "A"), team("b", "B"), team("c", "C")];
  const competitions = [competition("liga", "Liga"), competition("copa", "Copa")];

  it("counts active teams and pending entries when complete", () => {
    const index = buildTeamParticipationIndex(competitions, [
      {
        kind: "data",
        participants: [entry("liga", "a", "approved"), entry("liga", "b", "pending")],
      },
      {
        kind: "data",
        participants: [entry("copa", "b", "pending")],
      },
    ]);
    expect(summarizeOrganizationTeams(teams, index)).toEqual({
      totalTeams: 3,
      activeTeams: 2,
      pendingEntries: 2,
    });
  });

  it("returns null for derived counts when participation is incomplete", () => {
    const index = buildTeamParticipationIndex(competitions, [
      { kind: "data", participants: [entry("liga", "a", "approved")] },
      { kind: "error" },
    ]);
    expect(summarizeOrganizationTeams(teams, index)).toEqual({
      totalTeams: 3,
      activeTeams: null,
      pendingEntries: null,
    });
  });
});

describe("summarizeTeamStatus", () => {
  it("prioritizes pending over approved and distinguishes none from unavailable", () => {
    expect(
      summarizeTeamStatus(
        [
          { competitionId: "c1", competitionName: "C1", status: "approved" },
          { competitionId: "c2", competitionName: "C2", status: "pending" },
        ],
        true,
      ),
    ).toEqual({ kind: "pending", count: 1 });
    expect(
      summarizeTeamStatus(
        [{ competitionId: "c1", competitionName: "C1", status: "approved" }],
        true,
      ),
    ).toEqual({ kind: "approved", count: 1 });
    expect(
      summarizeTeamStatus(
        [{ competitionId: "c1", competitionName: "C1", status: "rejected" }],
        true,
      ),
    ).toEqual({ kind: "rejected", count: 1 });
    expect(summarizeTeamStatus([], true)).toEqual({ kind: "none" });
    expect(summarizeTeamStatus([], false)).toEqual({ kind: "unavailable" });
  });
});

describe("teamInitials", () => {
  it("builds two-letter initials for multi-word and single-word names", () => {
    expect(teamInitials("Atlético Pumas")).toBe("AP");
    expect(teamInitials("Lobos")).toBe("LO");
    expect(teamInitials("   ")).toBe("?");
  });
});

describe("getParticipationFilterReadiness", () => {
  const competitions = [competition("liga", "Liga"), competition("copa", "Copa")];

  it("is always ready for name-only search even while competitions load or fail", () => {
    expect(
      getParticipationFilterReadiness(
        { query: "pumas", status: "all", competitionId: "all" },
        [],
        [],
        "loading",
      ),
    ).toBe("ready");
    expect(
      getParticipationFilterReadiness(
        { query: "pumas", status: "all", competitionId: "all" },
        [],
        [],
        "error",
      ),
    ).toBe("ready");
  });

  it("reports loading, error and forbidden for status filters with incomplete participation", () => {
    expect(
      getParticipationFilterReadiness(
        { query: "", status: "pending", competitionId: "all" },
        competitions,
        [{ kind: "data", participants: [] }, { kind: "loading" }],
        "ready",
      ),
    ).toBe("loading");
    expect(
      getParticipationFilterReadiness(
        { query: "", status: "pending", competitionId: "all" },
        competitions,
        [{ kind: "error" }, { kind: "data", participants: [] }],
        "ready",
      ),
    ).toBe("error");
    expect(
      getParticipationFilterReadiness(
        { query: "", status: "none", competitionId: "all" },
        competitions,
        [{ kind: "forbidden" }, { kind: "data", participants: [] }],
        "ready",
      ),
    ).toBe("forbidden");
  });

  it("uses only the selected competition query state when filtering by a specific competition", () => {
    expect(
      getParticipationFilterReadiness(
        { query: "", status: "pending", competitionId: "copa" },
        competitions,
        [{ kind: "error" }, { kind: "data", participants: [] }],
        "ready",
      ),
    ).toBe("ready");
    expect(
      getParticipationFilterReadiness(
        { query: "", status: "pending", competitionId: "liga" },
        competitions,
        [{ kind: "error" }, { kind: "data", participants: [] }],
        "ready",
      ),
    ).toBe("error");
  });
});

describe("formatTeamCreatedAt", () => {
  it("formats in the requested locale on UTC", () => {
    expect(formatTeamCreatedAt("2026-10-03T23:30:00.000Z", "en")).toBe("Oct 3, 2026");
  });
});
