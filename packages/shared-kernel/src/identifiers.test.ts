import { describe, expect, it } from "vite-plus/test";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
} from "./identifiers.ts";

describe("identifiers", () => {
  it("brands string identifiers", () => {
    expect(asActorId("actor-1")).toBe("actor-1");
    expect(asOrganizationId("org-1")).toBe("org-1");
    expect(asCompetitionId("comp-1")).toBe("comp-1");
    expect(asTeamId("team-1")).toBe("team-1");
    expect(asEncounterId("enc-1")).toBe("enc-1");
  });
});
