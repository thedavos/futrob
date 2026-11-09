import { fixedPlanLimits } from "../plan-limits.test-helper.ts";
import { FakeCompetitionRepository } from "../fake-competition-repository.test-helper.ts";
import { describe, expect, it } from "vite-plus/test";
import { asActorId, asOrganizationId } from "@futrob/shared-kernel";
import { InvalidCompetitionTimeZone } from "../../domain/errors/competition.errors.ts";

import { CreateCompetitionDraftUseCase } from "./create-competition-draft.use-case.ts";
import { allowAllAuthorization } from "../allow-all-authorization.test-helper.ts";

function createHarness(planLimits = fixedPlanLimits()) {
  const competitions = new FakeCompetitionRepository();
  let nextId = 0;
  return {
    competitions,
    planLimits,
    useCase: new CreateCompetitionDraftUseCase({
      planLimits,
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
      rankingEligibility: null,
      knockoutStage: null,
      regularStage: {
        officialMatchesPerEncounter: 1,
        resolutionMode: "independent_matches",
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        maxReschedulesPerTeam: 2,
        minimumRescheduleNoticeHours: 12,
        rescheduleProposalExpiryHours: 12,
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

describe("CreateCompetitionDraftUseCase plan limits", () => {
  const freePlan = { maxActiveCompetitions: 1, allowedFormats: ["league", "knockout"] as const };

  it("rejects a second active competition with a stable code and allows it after an upgrade", async () => {
    const harness = createHarness(
      fixedPlanLimits({ ...freePlan, allowedFormats: ["league", "knockout"] }),
    );
    expect((await harness.useCase.execute({ ...baseInput, creationKey: "first" })).isOk()).toBe(
      true,
    );

    const second = await harness.useCase.execute({ ...baseInput, creationKey: "second" });

    expect(!second.isOk() && second.error).toMatchObject({
      code: "competitions.plan_limit_reached",
      limit: "active_competitions",
      max: 1,
    });
    harness.planLimits.set({ maxActiveCompetitions: 5 });
    expect((await harness.useCase.execute({ ...baseInput, creationKey: "second" })).isOk()).toBe(
      true,
    );
  });

  it("replays the same creation key and ignores finished competitions", async () => {
    const harness = createHarness(fixedPlanLimits({ ...freePlan, allowedFormats: ["league"] }));
    const first = await harness.useCase.execute({ ...baseInput, creationKey: "first" });
    expect((await harness.useCase.execute({ ...baseInput, creationKey: "first" })).isOk()).toBe(
      true,
    );
    if (!first.isOk()) return;
    await harness.competitions.saveDraft({
      ...first.value,
      competition: { ...first.value.competition, status: "finished" },
    });

    expect((await harness.useCase.execute({ ...baseInput, creationKey: "next" })).isOk()).toBe(
      true,
    );
  });

  it("rejects a format the plan does not include", async () => {
    const harness = createHarness(fixedPlanLimits({ allowedFormats: ["league", "knockout"] }));

    const result = await harness.useCase.execute({ ...baseInput, format: "groups-knockout" });

    expect(!result.isOk() && result.error).toMatchObject({
      code: "competitions.format_not_in_plan",
      format: "groups-knockout",
      allowedFormats: ["league", "knockout"],
    });
  });
});
