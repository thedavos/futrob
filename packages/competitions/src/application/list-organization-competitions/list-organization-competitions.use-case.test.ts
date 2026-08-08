import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import type { Competition } from "../../domain/entities/competition.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";
import { ListOrganizationCompetitionsUseCase } from "./list-organization-competitions.use-case.ts";

class FakeCompetitionRepository implements CompetitionRepository {
  readonly rows = new Map<string, CompetitionDraft>();

  async saveDraft(draft: CompetitionDraft) {
    this.rows.set(draft.competition.id, draft);
    return draft;
  }

  async findById(
    organizationId: ReturnType<typeof asOrganizationId>,
    competitionId: ReturnType<typeof asCompetitionId>,
  ) {
    const draft = this.rows.get(competitionId) ?? null;
    return draft?.competition.organizationId === organizationId ? draft : null;
  }

  async findByCreationKey(creationKey: string) {
    return (
      [...this.rows.values()].find((row) => row.competition.creationKey === creationKey) ?? null
    );
  }

  async findRulesByCompetitionId(competitionId: ReturnType<typeof asCompetitionId>) {
    return this.rows.get(competitionId)?.rules ?? null;
  }

  async listByOrganization(organizationId: ReturnType<typeof asOrganizationId>) {
    return [...this.rows.values()]
      .map((row) => row.competition)
      .filter((competition) => competition.organizationId === organizationId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
}

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
