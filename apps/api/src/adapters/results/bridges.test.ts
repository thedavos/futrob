import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryProviderMatchRepository } from "@/adapters/game-data/persistence/in-memory.repository.ts";
import { RepositoryProviderMatchReader, RosterTeamRepresentationReader } from "./bridges.ts";
import { InMemoryExternalClubConnectionRepository } from "@/adapters/teams/external-club-connection.repository.ts";

const query = {
  encounterId: asEncounterId("encounter-1"),
  homeTeamId: asTeamId("team-home"),
  awayTeamId: asTeamId("team-away"),
  window: {
    from: new Date("2026-09-14T02:00:00.000Z"),
    to: new Date("2026-09-15T14:00:00.000Z"),
  },
};

describe("RepositoryProviderMatchReader", () => {
  it("reports exactly which clubs are not connected", async () => {
    const connections = new InMemoryExternalClubConnectionRepository();
    await connections.upsert({
      teamId: query.homeTeamId,
      providerKey: "ea-clubs",
      externalClubId: "club-home",
      externalClubName: "Home Club",
      gameEdition: "FC 26",
      platform: "common-gen5",
    });
    const reader = new RepositoryProviderMatchReader(
      new InMemoryProviderMatchRepository(),
      connections,
    );

    await expect(reader.listCandidatesForEncounter(query)).resolves.toEqual({
      status: "clubs_not_connected",
      sides: ["away"],
    });
  });

  it("does not mix connections from different providers", async () => {
    const connections = new InMemoryExternalClubConnectionRepository();
    await connections.upsert({
      teamId: query.homeTeamId,
      providerKey: "ea-clubs",
      externalClubId: "club-home",
      externalClubName: "Home Club",
      gameEdition: "FC 26",
      platform: "common-gen5",
    });
    await connections.upsert({
      teamId: query.awayTeamId,
      providerKey: "manual",
      externalClubId: "club-away",
      externalClubName: "Away Club",
      gameEdition: "FC 26",
      platform: "common-gen5",
    });
    const reader = new RepositoryProviderMatchReader(
      new InMemoryProviderMatchRepository(),
      connections,
    );

    await expect(reader.listCandidatesForEncounter(query)).resolves.toEqual({
      status: "provider_mismatch",
    });
  });
});

describe("RosterTeamRepresentationReader", () => {
  const organizationId = asOrganizationId("org-1");
  const competitionId = asCompetitionId("competition-1");
  const teamId = asTeamId("team-home");
  const actorId = asActorId("actor-1");

  function reader(input: {
    readonly profile?: boolean;
    readonly role?: "captain" | "vice_captain" | "player";
    readonly membershipOrganization?: string;
    readonly entryStatus?: string | null;
  }) {
    return new RosterTeamRepresentationReader({
      profiles: {
        findByActor: async () => (input.profile === false ? null : ({ id: "profile-1" } as never)),
      },
      rosters: {
        findByTeamPlayerCompetition: async () =>
          ({
            organizationId: asOrganizationId(input.membershipOrganization ?? "org-1"),
            role: input.role ?? "captain",
          }) as never,
      },
      entries: {
        findByCompetitionAndTeam: async () =>
          input.entryStatus === null
            ? null
            : ({ status: input.entryStatus ?? "approved" } as never),
      },
    });
  }
  const ask = (source: RosterTeamRepresentationReader) =>
    source.findRepresentation({ actorId, organizationId, competitionId, teamId });

  it("accepts a captain or vice captain of a team with an approved entry", async () => {
    await expect(ask(reader({}))).resolves.toEqual({ teamId, role: "captain" });
    await expect(ask(reader({ role: "vice_captain" }))).resolves.toEqual({
      teamId,
      role: "vice_captain",
    });
  });

  it("denies players, missing profiles, other organizations and unapproved entries", async () => {
    await expect(ask(reader({ role: "player" }))).resolves.toBeNull();
    await expect(ask(reader({ profile: false }))).resolves.toBeNull();
    await expect(ask(reader({ membershipOrganization: "org-2" }))).resolves.toBeNull();
    await expect(ask(reader({ entryStatus: "pending" }))).resolves.toBeNull();
    await expect(ask(reader({ entryStatus: null }))).resolves.toBeNull();
  });
});
