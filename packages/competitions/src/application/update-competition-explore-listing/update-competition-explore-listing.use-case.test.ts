import { describe, expect, it } from "vite-plus/test";
import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  type AuthorizationPort,
} from "@futrob/shared-kernel";
import type { Competition } from "../../domain/entities/competition.ts";
import { allowAllAuthorization } from "../allow-all-authorization.test-helper.ts";
import { FakeCompetitionRepository } from "../fake-competition-repository.test-helper.ts";
import { UpdateCompetitionExploreListingUseCase } from "./update-competition-explore-listing.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("c-1");
const actorId = asActorId("actor-1");
const now = new Date("2026-11-18T12:00:00.000Z");

function competition(overrides: Partial<Competition> = {}): Competition {
  return {
    id: competitionId,
    organizationId,
    name: "Liga Norte",
    status: "registration",
    modality: "fc-clubs",
    exploreListing: "listed",
    gameEdition: "FC 26",
    platform: "playstation",
    region: "america",
    timeZone: "America/Lima",
    format: "league",
    teams: { min: 2, max: null },
    schedule: { startsOn: null, endsOn: null },
    cover: { kind: "preset", preset: "cup" },
    createdByActorId: actorId,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-02T00:00:00.000Z"),
    ...overrides,
  };
}

function setup(stored: Competition, authorization: AuthorizationPort = allowAllAuthorization) {
  const competitions = new FakeCompetitionRepository([
    {
      competition: stored,
      rules: {
        competitionId,
        version: 1,
        regularStage: null,
        knockoutStage: null,
        awayGoalsEnabled: false,
        maxRosterSize: null,
        rankingEligibility: null,
        createdAt: stored.createdAt,
      },
    },
  ]);
  const useCase = new UpdateCompetitionExploreListingUseCase({
    competitions,
    authorization,
    clock: { now: () => now },
  });
  return { competitions, useCase };
}

const input = { actorId, organizationId, competitionId };

describe("UpdateCompetitionExploreListingUseCase", () => {
  it("unlists and lists again, keeping status and structure", async () => {
    const { competitions, useCase } = setup(competition());

    const hidden = await useCase.execute({ ...input, exploreListing: "unlisted" });
    expect(hidden.isOk() && hidden.value.competition).toMatchObject({
      exploreListing: "unlisted",
      status: "registration",
      updatedAt: now,
    });
    expect(competitions.rows.get(competitionId)?.competition.exploreListing).toBe("unlisted");

    const shown = await useCase.execute({ ...input, exploreListing: "listed" });
    expect(shown.isOk() && shown.value.competition.exploreListing).toBe("listed");
  });

  it("is idempotent: the same listing returns the stored competition untouched", async () => {
    const stored = competition({ exploreListing: "unlisted" });
    const { useCase } = setup(stored);

    const result = await useCase.execute({ ...input, exploreListing: "unlisted" });

    expect(result.isOk() && result.value.competition).toEqual(stored);
  });

  it("denies an actor without the competition update permission", async () => {
    const decisions: string[] = [];
    const { competitions, useCase } = setup(competition(), {
      ...allowAllAuthorization,
      decide: async (request) => {
        decisions.push(request.permission);
        return { ...request, allowed: false, reason: "denied" };
      },
    });

    const result = await useCase.execute({ ...input, exploreListing: "unlisted" });

    expect(decisions).toEqual(["competitions.update"]);
    expect(!result.isOk() && result.error.code).toBe("authorization.forbidden");
    expect(competitions.rows.get(competitionId)?.competition.exploreListing).toBe("listed");
  });

  it("reports a missing competition and keeps an archived one read-only", async () => {
    const missing = await setup(competition()).useCase.execute({
      ...input,
      competitionId: asCompetitionId("missing"),
      exploreListing: "unlisted",
    });
    expect(!missing.isOk() && missing.error.code).toBe("competitions.not_found");

    const archived = await setup(competition({ status: "archived" })).useCase.execute({
      ...input,
      exploreListing: "unlisted",
    });
    expect(!archived.isOk() && archived.error.code).toBe("competitions.not_editable");
  });
});
