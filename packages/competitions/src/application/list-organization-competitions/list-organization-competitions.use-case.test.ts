import { FakeCompetitionRepository } from "../fake-competition-repository.test-helper.ts";
import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import type { Competition } from "../../domain/entities/competition.ts";

import { ListOrganizationCompetitionsUseCase } from "./list-organization-competitions.use-case.ts";

function competition(
  patch: Partial<Competition> & Pick<Competition, "id" | "name" | "updatedAt">,
): Competition {
  return {
    organizationId: asOrganizationId("org-1"),
    status: "draft",
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
    createdAt: new Date("2026-07-31T12:00:00.000Z"),
    ...patch,
  };
}

describe("ListOrganizationCompetitionsUseCase", () => {
  it("returns competitions for the organization newest-first", async () => {
    const competitions = new FakeCompetitionRepository();
    await competitions.saveDraft({
      competition: competition({
        id: asCompetitionId("c-old"),
        name: "Antigua",
        updatedAt: new Date("2026-07-01T00:00:00.000Z"),
      }),
      rules: {
        competitionId: asCompetitionId("c-old"),
        version: 1,
        regularStage: null,
        knockoutStage: null,
        awayGoalsEnabled: false,
        maxRosterSize: null,
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
      },
    });
    await competitions.saveDraft({
      competition: competition({
        id: asCompetitionId("c-new"),
        name: "Nueva",
        updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      }),
      rules: {
        competitionId: asCompetitionId("c-new"),
        version: 1,
        regularStage: null,
        knockoutStage: null,
        awayGoalsEnabled: false,
        maxRosterSize: null,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    });
    await competitions.saveDraft({
      competition: competition({
        id: asCompetitionId("c-other"),
        name: "Otra org",
        organizationId: asOrganizationId("org-2"),
        updatedAt: new Date("2026-08-02T00:00:00.000Z"),
      }),
      rules: {
        competitionId: asCompetitionId("c-other"),
        version: 1,
        regularStage: null,
        knockoutStage: null,
        awayGoalsEnabled: false,
        maxRosterSize: null,
        createdAt: new Date("2026-08-02T00:00:00.000Z"),
      },
    });

    const listed = await new ListOrganizationCompetitionsUseCase(competitions).execute({
      organizationId: asOrganizationId("org-1"),
    });

    expect(listed.map((item) => item.id)).toEqual(["c-new", "c-old"]);
  });
});
