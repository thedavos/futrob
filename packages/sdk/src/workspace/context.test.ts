import type {
  AccessibleCompetitionDto,
  MembershipSummaryDto,
  PlayerExternalClubAssociationDto,
} from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import {
  buildWorkspaceOptions,
  isSameWorkspaceContext,
  resolvePersonalExternalClubId,
  workspaceContextKey,
  workspaceContextName,
  workspaceContextPath,
  type WorkspaceContext,
} from "./index.ts";

const date = "2026-09-01T00:00:00.000Z";

function membership(
  organizationId: string,
  role: MembershipSummaryDto["role"],
): MembershipSummaryDto {
  return {
    organizationId,
    organizationName: `Org ${organizationId}`,
    organizationSlug: organizationId,
    organizationLogo: { kind: "monogram" },
    role,
  };
}

function competition(
  id: string,
  organizationId: string,
  role: AccessibleCompetitionDto["role"],
): AccessibleCompetitionDto {
  return {
    role,
    competition: {
      id,
      organizationId,
      name: `Copa ${id}`,
      status: "published",
      modality: "fc-clubs",
      gameEdition: "fc26",
      platform: "playstation",
      region: "south-america",
      timeZone: "America/Lima",
      format: "league",
      teams: { min: 2, max: null },
      schedule: { startsOn: null, endsOn: null },
      cover: { kind: "preset", preset: "cup" },
      createdAt: date,
      updatedAt: date,
    },
  };
}

const club: PlayerExternalClubAssociationDto = {
  playerProfileId: "profile-1",
  providerKey: "ea-clubs",
  externalClubId: "club-cuervos",
  externalClubName: "Cuervos FC1",
  platform: "common-gen5",
  gameEdition: "fc26",
  imageUrl: null,
  associatedAt: date,
};

describe("buildWorkspaceOptions", () => {
  const options = buildWorkspaceOptions({
    memberships: [membership("org-a", "organizer"), membership("org-b", "member")],
    competitions: [
      competition("cup-a", "org-a", "player"),
      competition("cup-b", "org-b", "captain"),
      competition("cup-c", "org-c", "vice_captain"),
    ],
    externalClubs: [club],
  });

  it("lists each club as a personal context narrowed to that club", () => {
    expect(options.clubs).toEqual([
      {
        externalClubId: "club-cuervos",
        name: "Cuervos FC1",
        imageUrl: null,
        context: { kind: "personal", externalClubId: "club-cuervos" },
      },
    ]);
  });

  it("keeps the strongest role: an organizer outranks their own player access", () => {
    expect(options.competitions.map((item) => [item.competitionId, item.role])).toEqual([
      ["cup-a", "organizer"],
      ["cup-b", "captain"],
      ["cup-c", "vice_captain"],
    ]);
    expect(options.competitions[2]?.context).toEqual({
      kind: "competition",
      organizationId: "org-c",
      competitionId: "cup-c",
    });
  });

  it("lists every membership as an organization context", () => {
    expect(options.organizations).toEqual([
      {
        organizationId: "org-a",
        name: "Org org-a",
        role: "organizer",
        context: { kind: "organization", organizationId: "org-a" },
      },
      {
        organizationId: "org-b",
        name: "Org org-b",
        role: "member",
        context: { kind: "organization", organizationId: "org-b" },
      },
    ]);
  });

  it("names the active entity, and nothing for a personal space without a club", () => {
    expect(workspaceContextName({ kind: "organization", organizationId: "org-b" }, options)).toBe(
      "Org org-b",
    );
    expect(
      workspaceContextName(
        { kind: "competition", organizationId: "org-a", competitionId: "cup-a" },
        options,
      ),
    ).toBe("Copa cup-a");
    expect(
      workspaceContextName({ kind: "personal", externalClubId: "club-cuervos" }, options),
    ).toBe("Cuervos FC1");
    expect(workspaceContextName({ kind: "personal" }, options)).toBeUndefined();
    expect(
      workspaceContextName({ kind: "organization", organizationId: "org-a" }, undefined),
    ).toBeUndefined();
  });
});

describe("workspace context identity and routes", () => {
  const contexts: [WorkspaceContext, string, string][] = [
    [{ kind: "personal" }, "personal", "/player"],
    [{ kind: "personal", externalClubId: "club a" }, "personal:club a", "/player?club=club%20a"],
    [{ kind: "organization", organizationId: "org/a" }, "organization:org/a", "/orgs/org%2Fa"],
    [
      { kind: "competition", organizationId: "org-a", competitionId: "cup-a" },
      "competition:cup-a",
      "/orgs/org-a/competitions/cup-a",
    ],
  ];

  it.each(contexts)("keys and routes %o", (context, key, path) => {
    expect(workspaceContextKey(context)).toBe(key);
    expect(workspaceContextPath(context)).toBe(path);
  });

  it("treats a personal space with a different club as a different context", () => {
    expect(
      isSameWorkspaceContext({ kind: "personal", externalClubId: "a" }, { kind: "personal" }),
    ).toBe(false);
    expect(
      isSameWorkspaceContext(
        { kind: "personal", externalClubId: "a" },
        { kind: "personal", externalClubId: "a" },
      ),
    ).toBe(true);
  });
});

describe("resolvePersonalExternalClubId", () => {
  it("keeps a preferred club that is still associated", () => {
    expect(resolvePersonalExternalClubId("b", ["a", "b"])).toBe("b");
  });

  it("falls back to the first association when the preference is gone or absent", () => {
    expect(resolvePersonalExternalClubId("gone", ["a", "b"])).toBe("a");
    expect(resolvePersonalExternalClubId(undefined, ["a"])).toBe("a");
  });

  it("returns nothing without associations", () => {
    expect(resolvePersonalExternalClubId("a", [])).toBeUndefined();
  });
});
