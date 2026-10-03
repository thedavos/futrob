import { describe, expect, it } from "vite-plus/test";
import { gameProfile, invitation, lastMatch, profile, snapshot } from "./player-home.fixtures";
import { resolvePlayerHome, type PlayerHomeSource } from "./player-home-model";

const failure: PlayerHomeSource<never> = { kind: "error", error: { kind: "network" } };

describe("resolvePlayerHome", () => {
  it("asks for onboarding when neither selection nor account exists", () => {
    expect(
      resolvePlayerHome(
        snapshot({
          externalClubId: undefined,
          profile: { kind: "ready", data: { profile: null, gameAccounts: [], externalClubs: [] } },
        }),
      ),
    ).toMatchObject({
      kind: "onboarding",
      selectedClub: null,
      headerCta: null,
      hero: { kind: "onboarding" },
      eaCard: { kind: "unlinked" },
      performance: { kind: "onboarding" },
      bottomLeft: { kind: "onboarding" },
    });
  });

  it("asks for explicit club selection with an account and preserves independent invitations", () => {
    expect(resolvePlayerHome(snapshot({ externalClubId: undefined }))).toMatchObject({
      kind: "select-club",
      selectedClub: null,
      hero: { kind: "select-club" },
      eaCard: { kind: "linked", gamertag: "davos282" },
      invitations: { kind: "pending", count: 1 },
      performance: { kind: "onboarding" },
    });
  });

  it("does not silently select an associated club when the supplied ID is invalid", () => {
    expect(resolvePlayerHome(snapshot({ externalClubId: "club-unknown" }))).toMatchObject({
      kind: "invalid-club",
      selectedClub: null,
      headerCta: null,
      hero: { kind: "invalid-club" },
      performance: { kind: "invalid-club" },
      bottomLeft: { kind: "invalid-club" },
    });
  });

  it("prioritizes no competitions over a known next encounter", () => {
    expect(
      resolvePlayerHome(snapshot({ competitions: { kind: "ready", data: { competitions: [] } } })),
    ).toMatchObject({
      kind: "dashboard",
      hero: { kind: "no-competitions" },
      bottomRight: { kind: "empty" },
    });
  });

  it("shows no upcoming encounter when accessible competitions exist", () => {
    expect(
      resolvePlayerHome(snapshot({ nextEncounter: { kind: "ready", data: { encounter: null } } }))
        .hero,
    ).toEqual({ kind: "no-upcoming" });
  });

  it("counts only pending invitations and distinguishes a successful empty inbox", () => {
    const statuses = ["pending", "pending", "accepted", "declined", "revoked", "expired"] as const;
    expect(
      resolvePlayerHome(
        snapshot({
          invitations: {
            kind: "ready",
            data: {
              invitations: statuses.map((status, index) => invitation(`invite-${index}`, status)),
            },
          },
        }),
      ).invitations,
    ).toEqual({ kind: "pending", count: 2 });
    expect(
      resolvePlayerHome(snapshot({ invitations: { kind: "ready", data: { invitations: [] } } }))
        .invitations,
    ).toEqual({ kind: "empty" });
  });

  it("preserves server order, roles and complete selected club metadata", () => {
    const model = resolvePlayerHome(
      snapshot({
        recentMatches: {
          kind: "ready",
          data: {
            status: "ready",
            matches: [
              lastMatch,
              {
                ...lastMatch,
                match: {
                  ...lastMatch.match,
                  id: "newer-but-second",
                  occurredAt: "2026-10-01T00:00:00.000Z",
                },
              },
            ],
          },
        },
      }),
    );
    expect(model.bottomLeft).toEqual({ kind: "last-match", last: lastMatch });
    expect(model.selectedClub).toEqual(profile.externalClubs[0]);
    expect(model.bottomRight).toMatchObject({
      kind: "list",
      competitions: [{ role: "player", competition: { id: "competition-liga" } }],
    });
    expect(model.performance).toEqual({ kind: "stats", profile: gameProfile });
    expect(model.headerCta).toBe("matches");
  });

  it("preserves a not_played match without fabricating a personal appearance or stats", () => {
    const notPlayed = {
      kind: "not_played",
      match: lastMatch.match,
      listedExternalClubId: "club-cuervos",
      listedMvpDisplayName: null,
    } as const;
    const model = resolvePlayerHome(
      snapshot({
        recentMatches: { kind: "ready", data: { status: "ready", matches: [notPlayed] } },
      }),
    );
    expect(model.bottomLeft).toEqual({ kind: "last-match", last: notPlayed });
    expect(model.performance).toEqual({ kind: "stats", profile: gameProfile });
    // Performance remains the server's aggregate, not an appearance inferred from this match.
    expect(model.performance).toMatchObject({
      profile: { summary: { matchesPlayed: 1, totals: { assists: 1 } } },
    });
  });

  it("preserves the server's competition order and each access role", () => {
    const source = snapshot().competitions;
    if (source.kind !== "ready") throw new Error("Fixture");
    const first = source.data.competitions[0];
    const model = resolvePlayerHome(
      snapshot({
        competitions: {
          kind: "ready",
          data: {
            competitions: [
              { role: "captain", competition: { ...first.competition, id: "competition-z" } },
              { role: "player", competition: { ...first.competition, id: "competition-a" } },
            ],
          },
        },
      }),
    );
    expect(model.bottomRight).toMatchObject({
      kind: "list",
      competitions: [
        { role: "captain", competition: { id: "competition-z" } },
        { role: "player", competition: { id: "competition-a" } },
      ],
    });
  });

  it("offers a refresh for a valid empty match history", () => {
    expect(
      resolvePlayerHome(
        snapshot({ recentMatches: { kind: "ready", data: { status: "ready", matches: [] } } }),
      ),
    ).toMatchObject({
      headerCta: "refresh-matches",
      performance: { kind: "empty-matches" },
      bottomLeft: { kind: "empty-matches" },
    });
  });

  it("locks personal provider activity when no account is linked", () => {
    expect(
      resolvePlayerHome(
        snapshot({ profile: { kind: "ready", data: { ...profile, gameAccounts: [] } } }),
      ),
    ).toMatchObject({
      kind: "dashboard",
      eaCard: { kind: "unlinked" },
      headerCta: "competitions",
      performance: { kind: "locked" },
      bottomLeft: { kind: "locked" },
    });
  });

  it.each(["needs_club", "needs_game_account"] as const)(
    "distinguishes %s from empty provider data",
    (status) => {
      const kind = status === "needs_club" ? "needs-club" : "needs-game-account";
      expect(
        resolvePlayerHome(
          snapshot({
            recentMatches: { kind: "ready", data: { status } },
            gameProfile: { kind: "ready", data: { status } },
          }),
        ),
      ).toMatchObject({ headerCta: null, performance: { kind }, bottomLeft: { kind } });
    },
  );

  it("does not interpret a failed profile as an unlinked player", () => {
    expect(resolvePlayerHome(snapshot({ profile: failure }))).toMatchObject({
      kind: "error",
      hero: failure,
      eaCard: failure,
      performance: failure,
      bottomLeft: failure,
      invitations: { kind: "pending", count: 1 },
      bottomRight: { kind: "list" },
    });
  });

  it("preserves each source error in dependent slots", () => {
    expect(resolvePlayerHome(snapshot({ competitions: failure }))).toMatchObject({
      hero: failure,
      bottomRight: failure,
    });
    expect(resolvePlayerHome(snapshot({ nextEncounter: failure })).hero).toEqual(failure);
    expect(resolvePlayerHome(snapshot({ invitations: failure })).invitations).toEqual(failure);
    expect(resolvePlayerHome(snapshot({ gameProfile: failure }))).toMatchObject({
      performance: failure,
      bottomLeft: { kind: "last-match" },
    });
    expect(resolvePlayerHome(snapshot({ recentMatches: failure }))).toMatchObject({
      headerCta: null,
      performance: failure,
      bottomLeft: failure,
      hero: { kind: "next-encounter" },
    });
  });
});
