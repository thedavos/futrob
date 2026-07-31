import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";
import { CreateCompetitionDraftUseCase } from "./create-competition-draft.use-case.ts";

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
}

function createHarness() {
  const competitions = new FakeCompetitionRepository();
  let nextId = 0;
  return {
    competitions,
    useCase: new CreateCompetitionDraftUseCase({
      competitions,
      clock: { now: () => new Date("2026-07-31T12:00:00.000Z") },
      ids: { generate: () => `competition-${++nextId}` },
    }),
  };
}

const baseInput = {
  organizationId: asOrganizationId("org-1"),
  actorId: asActorId("actor-1"),
  name: "Liga Futrob",
  gameEdition: "FC 26",
  platform: "playstation" as const,
  region: "south-america" as const,
  timeZone: "America/Lima",
  format: "league" as const,
  creationKey: "onboarding:competition:actor-1",
};

describe("CreateCompetitionDraftUseCase", () => {
  it("creates a league draft with safe regular-stage rules", async () => {
    const result = await createHarness().useCase.execute(baseInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.competition).toMatchObject({
      name: "Liga Futrob",
      status: "draft",
      modality: "fc-clubs",
      format: "league",
    });
    expect(result.value.rules).toMatchObject({
      version: 1,
      awayGoalsEnabled: false,
      knockoutStage: null,
      regularStage: {
        officialMatchesPerEncounter: 1,
        resolutionMode: "independent_matches",
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        maxReschedulesPerTeam: 2,
        minimumRescheduleNoticeHours: 12,
      },
    });
  });

  it("updates the same draft on retry without creating a duplicate", async () => {
    const { competitions, useCase } = createHarness();
    const first = await useCase.execute(baseInput);
    const retried = await useCase.execute({ ...baseInput, name: "Liga Actualizada" });

    expect(first.ok && retried.ok).toBe(true);
    if (!first.ok || !retried.ok) return;
    expect(retried.value.competition.id).toBe(first.value.competition.id);
    expect(retried.value.competition.name).toBe("Liga Actualizada");
    expect(competitions.rows.size).toBe(1);
  });

  it("accepts a competition spanning America", async () => {
    const result = await createHarness().useCase.execute({
      ...baseInput,
      region: "america",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.competition.region).toBe("america");
  });

  it("rejects an invalid IANA time zone", async () => {
    const result = await createHarness().useCase.execute({
      ...baseInput,
      timeZone: "Lima/not-real",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("competitions.invalid_time_zone");
  });
});
