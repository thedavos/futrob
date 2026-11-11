import { describe, expect, it } from "vite-plus/test";
import { GetPublicTeamsUseCase } from "./get-public-teams.use-case.ts";
import {
  TEAM_NAMES,
  competitionSource,
  PUBLIC_KEY,
  publishedReader,
  teamDirectory,
} from "../public-portal.test-helper.ts";

describe("GetPublicTeamsUseCase", () => {
  it("lists the approved participants by name, alphabetically", async () => {
    const result = await new GetPublicTeamsUseCase({
      competitions: publishedReader(competitionSource()),
      teams: teamDirectory(TEAM_NAMES, ["Surquillo United", "Álamo FC", "Barranco FC"]),
    }).execute({ key: PUBLIC_KEY });

    expect(result.isOk() && result.value).toEqual({
      teams: [{ name: "Álamo FC" }, { name: "Barranco FC" }, { name: "Surquillo United" }],
    });
  });

  it("answers an empty list when no team was approved", async () => {
    const result = await new GetPublicTeamsUseCase({
      competitions: publishedReader(competitionSource()),
      teams: teamDirectory(TEAM_NAMES, []),
    }).execute({ key: PUBLIC_KEY });

    expect(result.isOk() && result.value).toEqual({ teams: [] });
  });

  it("does not read participants of an unpublished competition", async () => {
    const teams = teamDirectory(TEAM_NAMES);
    const result = await new GetPublicTeamsUseCase({
      competitions: publishedReader(competitionSource({ status: "draft" })),
      teams,
    }).execute({ key: PUBLIC_KEY });

    expect(result.isErr() && result.error.code).toBe("public_portal.competition_not_found");
    expect(teams.calls).toBe(0);
  });
});
