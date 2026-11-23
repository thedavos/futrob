import { describe, expect, it } from "vite-plus/test";
import { RATE_LIMIT_POLICY } from "@futrob/api-contracts";
import { DEFAULT_RATE_LIMIT_POLICIES, parseRateLimitPolicies } from "./rate-limit-policies.ts";

describe("rate-limit policies", () => {
  it("keeps search and invitation defaults independent", () => {
    expect(DEFAULT_RATE_LIMIT_POLICIES).toEqual({
      [RATE_LIMIT_POLICY.eaClubSearch]: {
        windowSeconds: 60,
        actorMaxAttempts: 10,
        ipMaxAttempts: 30,
      },
      [RATE_LIMIT_POLICY.invitationAccept]: {
        windowSeconds: 900,
        actorMaxAttempts: 5,
        ipMaxAttempts: 5,
      },
      [RATE_LIMIT_POLICY.invitationPreview]: {
        windowSeconds: 900,
        actorMaxAttempts: 5,
        ipMaxAttempts: 5,
      },
      [RATE_LIMIT_POLICY.invitationPublicPreview]: {
        windowSeconds: 900,
        actorMaxAttempts: 30,
        ipMaxAttempts: 30,
      },
      [RATE_LIMIT_POLICY.playerSearch]: {
        windowSeconds: 60,
        actorMaxAttempts: 30,
        ipMaxAttempts: 60,
      },
      [RATE_LIMIT_POLICY.publicClubSearch]: {
        windowSeconds: 60,
        actorMaxAttempts: 20,
        ipMaxAttempts: 20,
      },
      [RATE_LIMIT_POLICY.publicCompetitionExplore]: {
        windowSeconds: 60,
        actorMaxAttempts: 30,
        ipMaxAttempts: 30,
      },
    });
  });

  it("overrides defaults with positive environment integers", () => {
    const policies = parseRateLimitPolicies(
      {
        RATE_LIMIT_EA_CLUB_SEARCH_WINDOW_SECONDS: "30",
        RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX: "7",
        RATE_LIMIT_EA_CLUB_SEARCH_IP_MAX: "21",
        RATE_LIMIT_INVITATION_ACCEPT_WINDOW_SECONDS: "600",
        RATE_LIMIT_INVITATION_ACCEPT_ACTOR_MAX: "4",
        RATE_LIMIT_INVITATION_ACCEPT_IP_MAX: "6",
        RATE_LIMIT_INVITATION_PREVIEW_WINDOW_SECONDS: "300",
        RATE_LIMIT_INVITATION_PREVIEW_ACTOR_MAX: "3",
        RATE_LIMIT_INVITATION_PREVIEW_IP_MAX: "9",
        RATE_LIMIT_PUBLIC_CLUB_SEARCH_WINDOW_SECONDS: "120",
        RATE_LIMIT_PUBLIC_CLUB_SEARCH_ACTOR_MAX: "8",
        RATE_LIMIT_PUBLIC_CLUB_SEARCH_IP_MAX: "12",
        RATE_LIMIT_PUBLIC_COMPETITION_EXPLORE_WINDOW_SECONDS: "90",
        RATE_LIMIT_PUBLIC_COMPETITION_EXPLORE_ACTOR_MAX: "10",
        RATE_LIMIT_PUBLIC_COMPETITION_EXPLORE_IP_MAX: "15",
      },
      () => {
        throw new Error("every override is valid");
      },
    );

    expect(policies[RATE_LIMIT_POLICY.eaClubSearch]).toEqual({
      windowSeconds: 30,
      actorMaxAttempts: 7,
      ipMaxAttempts: 21,
    });
    expect(policies[RATE_LIMIT_POLICY.invitationAccept]).toEqual({
      windowSeconds: 600,
      actorMaxAttempts: 4,
      ipMaxAttempts: 6,
    });
    expect(policies[RATE_LIMIT_POLICY.invitationPreview]).toEqual({
      windowSeconds: 300,
      actorMaxAttempts: 3,
      ipMaxAttempts: 9,
    });
    expect(policies[RATE_LIMIT_POLICY.publicClubSearch]).toEqual({
      windowSeconds: 120,
      actorMaxAttempts: 8,
      ipMaxAttempts: 12,
    });
    expect(policies[RATE_LIMIT_POLICY.publicCompetitionExplore]).toEqual({
      windowSeconds: 90,
      actorMaxAttempts: 10,
      ipMaxAttempts: 15,
    });
  });

  it.each(["0", "-1", "1.5", "not-a-number"])(
    "keeps the default and reports the variable for invalid override %s",
    (value) => {
      const invalid: string[] = [];
      const policies = parseRateLimitPolicies(
        {
          RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX: value,
          RATE_LIMIT_EA_CLUB_SEARCH_IP_MAX: "40",
        },
        (error) => invalid.push(`${error.code}: ${error.variable}`),
      );

      expect(invalid).toEqual(["rate_limit.config_invalid: RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX"]);
      expect(policies[RATE_LIMIT_POLICY.eaClubSearch]).toEqual({
        windowSeconds: DEFAULT_RATE_LIMIT_POLICIES[RATE_LIMIT_POLICY.eaClubSearch].windowSeconds,
        actorMaxAttempts:
          DEFAULT_RATE_LIMIT_POLICIES[RATE_LIMIT_POLICY.eaClubSearch].actorMaxAttempts,
        ipMaxAttempts: 40,
      });
    },
  );
});
