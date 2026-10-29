import { describe, expect, it } from "vite-plus/test";
import { asPublicCompetitionKey } from "../../domain/public-competition-key.ts";
import { GetPublicCompetitionUseCase } from "./get-public-competition.use-case.ts";
import {
  COMPETITION_ID,
  ORGANIZATION_ID,
  PUBLIC_KEY,
  UPLOAD_KEY,
  competitionSource,
  publishedReader,
} from "../public-portal.test-helper.ts";

const PORTADA_KEYS = [
  "approvedTeamCount",
  "coverPreset",
  "endsOn",
  "format",
  "gameEdition",
  "name",
  "platform",
  "region",
  "startsOn",
  "status",
  "timeZone",
];

describe("GetPublicCompetitionUseCase", () => {
  it("projects a published competition onto the portada allowlist", async () => {
    const result = await new GetPublicCompetitionUseCase(
      publishedReader(competitionSource({ cover: { kind: "preset", preset: "league" } })),
    ).execute({ key: PUBLIC_KEY });

    expect(result.isOk() && result.value).toEqual({
      name: "Copa Barranco",
      status: "published",
      format: "league",
      platform: "playstation",
      gameEdition: "fc26",
      region: "south-america",
      timeZone: "America/Lima",
      startsOn: "2026-11-01",
      endsOn: null,
      approvedTeamCount: 2,
      coverPreset: "league",
    });
  });

  it("never carries internal fields even when the source object has more than its type", async () => {
    const hostile = {
      ...competitionSource(),
      organizationId: ORGANIZATION_ID,
      createdByActorId: "actor-internal-1",
      creationKey: "creation-key-secret",
      invitationToken: "token-secret",
    };
    const result = await new GetPublicCompetitionUseCase(publishedReader(hostile)).execute({
      key: PUBLIC_KEY,
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(Object.keys(result.value).sort()).toEqual(PORTADA_KEYS);
    const wire = JSON.stringify(result.value);
    for (const secret of [
      ORGANIZATION_ID,
      COMPETITION_ID,
      UPLOAD_KEY,
      "actor-internal-1",
      "creation-key-secret",
      "token-secret",
    ]) {
      expect(wire).not.toContain(secret);
    }
  });

  it("hides an uploaded cover because its key names the organization", async () => {
    const result = await new GetPublicCompetitionUseCase(
      publishedReader(competitionSource()),
    ).execute({ key: PUBLIC_KEY });

    expect(result.isOk() && result.value.coverPreset).toBeNull();
  });

  it.each(["published", "paused", "finished"] as const)(
    "serves a %s competition",
    async (status) => {
      const result = await new GetPublicCompetitionUseCase(
        publishedReader(competitionSource({ status })),
      ).execute({ key: PUBLIC_KEY });

      expect(result.isOk() && result.value.status).toBe(status);
    },
  );

  it.each(["draft", "registration", "archived"] as const)(
    "answers not found for a %s competition without saying why",
    async (status) => {
      const result = await new GetPublicCompetitionUseCase(
        publishedReader(competitionSource({ status, name: "Borrador secreto" })),
      ).execute({ key: PUBLIC_KEY });

      expect(result.isErr() && result.error.code).toBe("public_portal.competition_not_found");
      expect(JSON.stringify(result.isErr() && result.error)).not.toContain("Borrador secreto");
    },
  );

  it("answers not found for an unknown key, including the internal competition id", async () => {
    const reader = publishedReader(competitionSource());
    const useCase = new GetPublicCompetitionUseCase(reader);

    for (const key of ["missing", COMPETITION_ID]) {
      const result = await useCase.execute({ key: asPublicCompetitionKey(key) });
      expect(result.isErr() && result.error.code).toBe("public_portal.competition_not_found");
    }
  });
});
