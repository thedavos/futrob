import { FakeCompetitionRepository } from "../fake-competition-repository.test-helper.ts";
import { describe, expect, it } from "vite-plus/test";
import { asActorId, asOrganizationId } from "@futrob/shared-kernel";
import { InvalidCompetitionTimeZone } from "../../domain/errors/competition.errors.ts";

import { CreateCompetitionDraftUseCase } from "./create-competition-draft.use-case.ts";
import { allowAllAuthorization } from "../allow-all-authorization.test-helper.ts";

function createHarness() {
  const competitions = new FakeCompetitionRepository();
  let nextId = 0;
  return {
    competitions,
    useCase: new CreateCompetitionDraftUseCase({
      competitions,
      clock: { now: () => new Date("2026-07-31T12:00:00.000Z") },
      ids: { generate: () => `competition-${++nextId}` },
      authorization: allowAllAuthorization,
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

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.competition).toMatchObject({
      name: "Liga Futrob",
      status: "draft",
      modality: "fc-clubs",
      format: "league",
      teams: { min: 2, max: null },
      schedule: { startsOn: null, endsOn: null },
      cover: { kind: "preset", preset: "cup" },
    });
    expect(result.value.rules).toMatchObject({
      version: 1,
      awayGoalsEnabled: false,
      maxRosterSize: null,
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

    expect(first.isOk() && retried.isOk()).toBe(true);
    if (!first.isOk() || !retried.isOk()) return;
    expect(retried.value.competition.id).toBe(first.value.competition.id);
    expect(retried.value.competition.name).toBe("Liga Actualizada");
    expect(competitions.rows.size).toBe(1);
  });

  it("accepts a competition spanning America", async () => {
    const result = await createHarness().useCase.execute({
      ...baseInput,
      region: "america",
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.competition.region).toBe("america");
  });

  it("rejects an invalid IANA time zone", async () => {
    const result = await createHarness().useCase.execute({
      ...baseInput,
      timeZone: "Lima/not-real",
    });

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && InvalidCompetitionTimeZone.is(result.error)).toBe(true);
  });
});
