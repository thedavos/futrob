import { describe, expect, it } from "vite-plus/test";
import type {
  AccessibleCompetitionDto,
  NextEncounterDto,
  PlayerRecentProviderMatchDto,
} from "@futrob/api-contracts";
import {
  resolvePlayerHome,
  type PlayerHomeFacts,
  type PlayerHomeLayout,
} from "./player-home-model.ts";

const lastMatch: PlayerRecentProviderMatchDto = {
  kind: "played",
  listedExternalClubId: "club-cuervos",
  listedMvpDisplayName: null,
  appearance: {
    externalPlayerId: "davos282",
    displayName: "davos282",
    externalClubId: "club-cuervos",
    position: "ST",
    minutesPlayed: 12,
    goals: 0,
    assists: 1,
    shots: 2,
    passAttempts: 6,
    passesMade: 4,
    tackleAttempts: 0,
    tacklesMade: 0,
    saves: null,
    yellowCards: 0,
    redCards: 0,
    isMvp: true,
    rating: 10,
  },
  match: {
    id: "match-1",
    provider: { key: "ea-clubs", externalMatchId: "ea-1" },
    game: { edition: "fc26", platform: "common-gen5", mode: "leagueMatch" },
    occurredAt: "2026-09-06T04:42:00.000Z",
    home: {
      externalClubId: "club-cuervos",
      name: "Cuervos FC1",
      goals: 6,
      imageUrl: null,
    },
    away: {
      externalClubId: "club-maderas",
      name: "MADERAS FC",
      goals: 0,
      imageUrl: null,
    },
    metadata: {
      durationSeconds: 540,
      wasDisconnected: false,
      winnerByForfeit: false,
      completeness: "complete",
    },
  },
};

const nextEncounter: NextEncounterDto = {
  encounterId: "encounter-1",
  competition: {
    id: "competition-liga",
    organizationId: "org-1",
    name: "Liga Futrob",
    timeZone: "America/Lima",
  },
  round: { number: 4, total: 10 },
  scheduledStartAt: "2026-09-08T02:00:00.000Z",
  officialMatchCount: 1,
  home: {
    teamId: "team-cuervos",
    name: "Cuervos FC1",
    externalClub: {
      providerKey: "ea-clubs",
      externalClubId: "club-cuervos",
      name: "Cuervos FC1",
      platform: "common-gen5",
      gameEdition: "fc26",
      imageUrl: null,
    },
  },
  away: {
    teamId: "team-maderas",
    name: "MADERAS FC",
    externalClub: {
      providerKey: "ea-clubs",
      externalClubId: "club-maderas",
      name: "MADERAS FC",
      platform: "common-gen5",
      gameEdition: "fc26",
      imageUrl: null,
    },
  },
};

const competition: AccessibleCompetitionDto = {
  role: "player",
  competition: {
    id: "competition-liga",
    organizationId: "org-1",
    name: "Liga Futrob",
    status: "published",
    modality: "fc-clubs",
    gameEdition: "fc26",
    platform: "playstation",
    region: "south-america",
    timeZone: "America/Lima",
    format: "league",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
};

function facts(overrides: Partial<PlayerHomeFacts> = {}): PlayerHomeFacts {
  return {
    club: { kind: "selected", id: "club-cuervos", name: "Cuervos FC1", imageUrl: null },
    ea: { kind: "linked", gamertag: "davos282" },
    matches: { kind: "some", last: lastMatch },
    competitions: [competition],
    nextEncounter,
    pendingInvitations: 2,
    gameProfile: null,
    ...overrides,
  };
}

const nextHero = { kind: "next-encounter" as const, encounter: nextEncounter };
const jumpHero = { kind: "no-competitions" as const };
const pendingInvites = { kind: "pending" as const, count: 2 };
const emptyInvites = { kind: "empty" as const };
const linkedEa = { kind: "linked" as const, gamertag: "davos282" };
const unlinkedEa = { kind: "unlinked" as const };
const statsPerf = { kind: "stats" as const, profile: null };
const emptyPerf = { kind: "empty-matches" as const };
const lockedPerf = { kind: "locked" as const };
const lastSlot = { kind: "last-match" as const, last: lastMatch };
const emptyLast = { kind: "empty-matches" as const };
const lockedLast = { kind: "locked" as const };
const listComps = { kind: "list" as const, competitions: [competition] };
const emptyComps = { kind: "empty" as const };

const matrix: readonly {
  readonly name: string;
  readonly facts: PlayerHomeFacts;
  readonly expected: Pick<
    PlayerHomeLayout,
    "hero" | "invitations" | "eaCard" | "performance" | "bottomLeft" | "bottomRight" | "headerCta"
  >;
}[] = [
  {
    name: "1 Datos completos",
    facts: facts(),
    expected: {
      hero: nextHero,
      invitations: pendingInvites,
      eaCard: linkedEa,
      performance: statsPerf,
      bottomLeft: lastSlot,
      bottomRight: listComps,
      headerCta: "matches",
    },
  },
  {
    name: "2 Sin invitaciones",
    facts: facts({ pendingInvitations: 0 }),
    expected: {
      hero: nextHero,
      invitations: emptyInvites,
      eaCard: linkedEa,
      performance: statsPerf,
      bottomLeft: lastSlot,
      bottomRight: listComps,
      headerCta: "matches",
    },
  },
  {
    name: "3 Partidos e invitaciones",
    facts: facts({ competitions: [], nextEncounter: null }),
    expected: {
      hero: jumpHero,
      invitations: pendingInvites,
      eaCard: linkedEa,
      performance: statsPerf,
      bottomLeft: lastSlot,
      bottomRight: emptyComps,
      headerCta: "matches",
    },
  },
  {
    name: "4 Solo actividad de juego",
    facts: facts({ competitions: [], nextEncounter: null, pendingInvitations: 0 }),
    expected: {
      hero: jumpHero,
      invitations: emptyInvites,
      eaCard: linkedEa,
      performance: statsPerf,
      bottomLeft: lastSlot,
      bottomRight: emptyComps,
      headerCta: "matches",
    },
  },
  {
    name: "5 Competiciones e invitaciones, sin apariciones",
    facts: facts({ matches: { kind: "none" } }),
    expected: {
      hero: nextHero,
      invitations: pendingInvites,
      eaCard: linkedEa,
      performance: emptyPerf,
      bottomLeft: emptyLast,
      bottomRight: listComps,
      headerCta: "refresh-matches",
    },
  },
  {
    name: "6 Competiciones, sin apariciones",
    facts: facts({ matches: { kind: "none" }, pendingInvitations: 0 }),
    expected: {
      hero: nextHero,
      invitations: emptyInvites,
      eaCard: linkedEa,
      performance: emptyPerf,
      bottomLeft: emptyLast,
      bottomRight: listComps,
      headerCta: "refresh-matches",
    },
  },
  {
    name: "7 Vinculado, con invitaciones",
    facts: facts({ matches: { kind: "none" }, competitions: [], nextEncounter: null }),
    expected: {
      hero: jumpHero,
      invitations: pendingInvites,
      eaCard: linkedEa,
      performance: emptyPerf,
      bottomLeft: emptyLast,
      bottomRight: emptyComps,
      headerCta: "refresh-matches",
    },
  },
  {
    name: "8 Vinculado, esperando actividad",
    facts: facts({
      matches: { kind: "none" },
      competitions: [],
      nextEncounter: null,
      pendingInvitations: 0,
    }),
    expected: {
      hero: jumpHero,
      invitations: emptyInvites,
      eaCard: linkedEa,
      performance: emptyPerf,
      bottomLeft: emptyLast,
      bottomRight: emptyComps,
      headerCta: "refresh-matches",
    },
  },
  {
    name: "9 Actividad de Futrob, pendiente de vinculación",
    facts: facts({ ea: { kind: "unlinked" }, matches: { kind: "unavailable" } }),
    expected: {
      hero: nextHero,
      invitations: pendingInvites,
      eaCard: unlinkedEa,
      performance: lockedPerf,
      bottomLeft: lockedLast,
      bottomRight: listComps,
      headerCta: "competitions",
    },
  },
  {
    name: "10 Competiciones, pendiente de vinculación",
    facts: facts({
      ea: { kind: "unlinked" },
      matches: { kind: "unavailable" },
      pendingInvitations: 0,
    }),
    expected: {
      hero: nextHero,
      invitations: emptyInvites,
      eaCard: unlinkedEa,
      performance: lockedPerf,
      bottomLeft: lockedLast,
      bottomRight: listComps,
      headerCta: "competitions",
    },
  },
  {
    name: "11 Invitaciones para empezar",
    facts: facts({
      ea: { kind: "unlinked" },
      matches: { kind: "unavailable" },
      competitions: [],
      nextEncounter: null,
    }),
    expected: {
      hero: jumpHero,
      invitations: pendingInvites,
      eaCard: unlinkedEa,
      performance: lockedPerf,
      bottomLeft: lockedLast,
      bottomRight: emptyComps,
      headerCta: null,
    },
  },
  {
    name: "12 Vacío inicial",
    facts: facts({
      ea: { kind: "unlinked" },
      matches: { kind: "unavailable" },
      competitions: [],
      nextEncounter: null,
      pendingInvitations: 0,
    }),
    expected: {
      hero: jumpHero,
      invitations: emptyInvites,
      eaCard: unlinkedEa,
      performance: lockedPerf,
      bottomLeft: lockedLast,
      bottomRight: emptyComps,
      headerCta: null,
    },
  },
];

describe("resolvePlayerHome", () => {
  it.each(matrix)("$name", ({ facts: input, expected }) => {
    expect(resolvePlayerHome(input)).toMatchObject({ kind: "dashboard", ...expected });
  });

  it("uses A2 when there are competitions but no upcoming encounter", () => {
    expect(resolvePlayerHome(facts({ nextEncounter: null })).hero).toEqual({
      kind: "no-upcoming",
    });
  });

  it("shows the empty onboarding grid without a club or EA account", () => {
    expect(
      resolvePlayerHome(
        facts({
          club: { kind: "none" },
          ea: { kind: "unlinked" },
          matches: { kind: "unavailable" },
          competitions: [],
          nextEncounter: null,
          pendingInvitations: 0,
        }),
      ),
    ).toEqual({
      kind: "onboarding",
      headerCta: null,
      hero: { kind: "onboarding" },
      invitations: { kind: "onboarding" },
      eaCard: unlinkedEa,
      performance: { kind: "onboarding" },
      bottomLeft: { kind: "onboarding" },
      bottomRight: { kind: "onboarding" },
    });
  });

  it("asks for a club when EA is linked but none is selected", () => {
    expect(
      resolvePlayerHome(
        facts({
          club: { kind: "none" },
          matches: { kind: "none" },
          nextEncounter: null,
          pendingInvitations: 0,
        }),
      ),
    ).toEqual({
      kind: "select-club",
      headerCta: "refresh-matches",
      hero: { kind: "select-club" },
      invitations: emptyInvites,
      eaCard: linkedEa,
      performance: { kind: "onboarding" },
      bottomLeft: { kind: "onboarding" },
      bottomRight: listComps,
    });
  });
});
