import { describe, expect, it } from "vite-plus/test";
import {
  WORKSPACE_DISPLAY_ROLE,
  buildWorkspaceSelectorModel,
  resolveCreateCompetitionIntent,
} from "./workspace-selector-model.ts";

describe("buildWorkspaceSelectorModel", () => {
  it("prefers organizer over player access for a competition", () => {
    const model = buildWorkspaceSelectorModel({
      memberships: [{ organizationId: "org-1", name: "Acme", role: "organizer" }],
      competitions: [
        {
          competitionId: "cmp-1",
          organizationId: "org-1",
          name: "Liga Norte",
          accessRole: "player",
        },
      ],
      associatedClubs: [],
    });

    expect(model.competitions[0]?.role).toBe(WORKSPACE_DISPLAY_ROLE.organizer);
  });

  it("uses staff org role when access is captain", () => {
    const model = buildWorkspaceSelectorModel({
      memberships: [{ organizationId: "org-1", name: "Acme", role: "staff" }],
      competitions: [
        {
          competitionId: "cmp-1",
          organizationId: "org-1",
          name: "Liga Norte",
          accessRole: "captain",
        },
      ],
      associatedClubs: [],
    });

    expect(model.competitions[0]?.role).toBe(WORKSPACE_DISPLAY_ROLE.staff);
  });

  it("uses accessible competition role when org membership is only member", () => {
    const model = buildWorkspaceSelectorModel({
      memberships: [{ organizationId: "org-1", name: "Acme", role: "member" }],
      competitions: [
        {
          competitionId: "cmp-1",
          organizationId: "org-1",
          name: "Liga Norte",
          accessRole: "vice_captain",
        },
      ],
      associatedClubs: [],
    });

    expect(model.competitions[0]?.role).toBe(WORKSPACE_DISPLAY_ROLE.vice_captain);
  });

  it("defaults competition role to player when no access or host role exists", () => {
    const model = buildWorkspaceSelectorModel({
      memberships: [],
      competitions: [
        {
          competitionId: "cmp-1",
          organizationId: "org-1",
          name: "Liga Norte",
        },
      ],
      associatedClubs: [],
    });

    expect(model.competitions[0]?.role).toBe(WORKSPACE_DISPLAY_ROLE.player);
  });

  it("maps organization membership roles through", () => {
    const model = buildWorkspaceSelectorModel({
      memberships: [
        { organizationId: "org-1", name: "Acme", role: "organizer" },
        { organizationId: "org-2", name: "Beta", role: "member" },
      ],
      competitions: [],
      associatedClubs: [],
    });

    expect(model.organizations.map((item) => item.role)).toEqual([
      WORKSPACE_DISPLAY_ROLE.organizer,
      WORKSPACE_DISPLAY_ROLE.member,
    ]);
  });

  it("defaults club role to player when no roster matches the associated club", () => {
    const model = buildWorkspaceSelectorModel({
      memberships: [],
      competitions: [],
      associatedClubs: [
        {
          name: "Fera",
          imageUrl: null,
          externalClubId: "club-1",
        },
      ],
      clubRosterRoles: [{ externalClubId: "other", role: "captain" }],
    });

    expect(model.clubs).toEqual([
      {
        externalClubId: "club-1",
        name: "Fera",
        imageUrl: null,
        role: WORKSPACE_DISPLAY_ROLE.player,
      },
    ]);
  });

  it("picks the highest roster role for each associated club", () => {
    const model = buildWorkspaceSelectorModel({
      memberships: [],
      competitions: [],
      associatedClubs: [
        {
          name: "Fera",
          imageUrl: "https://example.com/crest.png",
          externalClubId: "club-1",
        },
        {
          name: "Night Owls",
          imageUrl: null,
          externalClubId: "club-2",
        },
      ],
      clubRosterRoles: [
        { externalClubId: "club-1", role: "player" },
        { externalClubId: "club-1", role: "vice_captain" },
        { externalClubId: "club-1", role: "captain" },
        { externalClubId: "club-2", role: "player" },
      ],
    });

    expect(model.clubs).toEqual([
      {
        externalClubId: "club-1",
        name: "Fera",
        imageUrl: "https://example.com/crest.png",
        role: WORKSPACE_DISPLAY_ROLE.captain,
      },
      {
        externalClubId: "club-2",
        name: "Night Owls",
        imageUrl: null,
        role: WORKSPACE_DISPLAY_ROLE.player,
      },
    ]);
  });

  it("returns no clubs when none are associated", () => {
    const model = buildWorkspaceSelectorModel({
      memberships: [],
      competitions: [],
      associatedClubs: [],
    });

    expect(model.clubs).toEqual([]);
  });

  it("resolves create-competition intent for 0, 1, and 2+ eligible orgs", () => {
    const none = buildWorkspaceSelectorModel({
      memberships: [{ organizationId: "org-1", name: "Acme", role: "member" }],
      competitions: [],
      associatedClubs: [],
    });
    expect(none.createCompetitionIntent).toEqual({ kind: "create-organization" });
    expect(none.eligibleHostOrganizations).toEqual([]);

    const one = buildWorkspaceSelectorModel({
      memberships: [{ organizationId: "org-1", name: "Acme", role: "staff" }],
      competitions: [],
      associatedClubs: [],
    });
    expect(one.createCompetitionIntent).toEqual({
      kind: "navigate",
      organizationId: "org-1",
    });

    const many = buildWorkspaceSelectorModel({
      memberships: [
        { organizationId: "org-1", name: "Acme", role: "organizer" },
        { organizationId: "org-2", name: "Beta", role: "staff" },
      ],
      competitions: [],
      associatedClubs: [],
    });
    expect(many.createCompetitionIntent).toEqual({
      kind: "pick-organization",
      organizations: [
        { organizationId: "org-1", name: "Acme", role: "organizer" },
        { organizationId: "org-2", name: "Beta", role: "staff" },
      ],
    });
  });
});

describe("resolveCreateCompetitionIntent", () => {
  it("treats exactly two orgs as pick-organization", () => {
    expect(
      resolveCreateCompetitionIntent([
        { organizationId: "a", name: "A", role: "organizer" },
        { organizationId: "b", name: "B", role: "staff" },
      ]),
    ).toEqual({
      kind: "pick-organization",
      organizations: [
        { organizationId: "a", name: "A", role: "organizer" },
        { organizationId: "b", name: "B", role: "staff" },
      ],
    });
  });
});
