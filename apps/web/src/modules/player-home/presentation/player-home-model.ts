import type {
  AccessibleCompetitionDto,
  NextEncounterDto,
  PlayerGameProfileDto,
  PlayerRecentProviderMatchDto,
} from "@futrob/api-contracts";

export type PlayerHomeClub =
  | { readonly kind: "none" }
  | {
      readonly kind: "selected";
      readonly id: string;
      readonly name: string;
      readonly imageUrl: string | null;
    };

export type PlayerHomeEa =
  | { readonly kind: "unlinked" }
  | { readonly kind: "linked"; readonly gamertag: string };

export type PlayerHomeMatches =
  | { readonly kind: "unavailable" }
  | { readonly kind: "none" }
  | { readonly kind: "some"; readonly last: PlayerRecentProviderMatchDto };

export type PlayerHomeFacts = {
  readonly club: PlayerHomeClub;
  readonly ea: PlayerHomeEa;
  readonly matches: PlayerHomeMatches;
  readonly competitions: readonly AccessibleCompetitionDto[];
  readonly nextEncounter: NextEncounterDto | null;
  readonly pendingInvitations: number;
  readonly gameProfile: PlayerGameProfileDto | null;
};

export type PlayerHomeHeaderCta = "matches" | "refresh-matches" | "competitions" | null;

export type PlayerHomeHeroSlot =
  | { readonly kind: "next-encounter"; readonly encounter: NextEncounterDto }
  | { readonly kind: "no-upcoming" }
  | { readonly kind: "no-competitions" }
  | { readonly kind: "select-club" }
  | { readonly kind: "onboarding" };

export type PlayerHomeInvitationsSlot =
  | { readonly kind: "pending"; readonly count: number }
  | { readonly kind: "empty" }
  | { readonly kind: "onboarding" };

export type PlayerHomeEaSlot =
  | { readonly kind: "linked"; readonly gamertag: string }
  | { readonly kind: "unlinked" };

export type PlayerHomePerformanceSlot =
  | { readonly kind: "stats"; readonly profile: PlayerGameProfileDto | null }
  | { readonly kind: "empty-matches" }
  | { readonly kind: "locked" }
  | { readonly kind: "onboarding" };

export type PlayerHomeBottomLeftSlot =
  | { readonly kind: "last-match"; readonly last: PlayerRecentProviderMatchDto }
  | { readonly kind: "empty-matches" }
  | { readonly kind: "locked" }
  | { readonly kind: "onboarding" };

export type PlayerHomeBottomRightSlot =
  | { readonly kind: "list"; readonly competitions: readonly AccessibleCompetitionDto[] }
  | { readonly kind: "empty" }
  | { readonly kind: "onboarding" };

export type PlayerHomeLayout = {
  readonly kind: "onboarding" | "select-club" | "dashboard";
  readonly headerCta: PlayerHomeHeaderCta;
  readonly hero: PlayerHomeHeroSlot;
  readonly invitations: PlayerHomeInvitationsSlot;
  readonly eaCard: PlayerHomeEaSlot;
  readonly performance: PlayerHomePerformanceSlot;
  readonly bottomLeft: PlayerHomeBottomLeftSlot;
  readonly bottomRight: PlayerHomeBottomRightSlot;
};

export function resolvePlayerHome(facts: PlayerHomeFacts): PlayerHomeLayout {
  const headerCta = resolveHeaderCta(facts);
  const eaCard = eaSlot(facts.ea);

  if (facts.club.kind === "none" && facts.ea.kind === "unlinked") {
    return {
      kind: "onboarding",
      headerCta,
      hero: { kind: "onboarding" },
      invitations: { kind: "onboarding" },
      eaCard,
      performance: { kind: "onboarding" },
      bottomLeft: { kind: "onboarding" },
      bottomRight: { kind: "onboarding" },
    };
  }

  if (facts.club.kind === "none") {
    return {
      kind: "select-club",
      headerCta,
      hero: { kind: "select-club" },
      invitations: invitationsSlot(facts.pendingInvitations),
      eaCard,
      performance: { kind: "onboarding" },
      bottomLeft: { kind: "onboarding" },
      bottomRight: competitionsSlot(facts.competitions),
    };
  }

  return {
    kind: "dashboard",
    headerCta,
    hero: heroSlot(facts),
    invitations: invitationsSlot(facts.pendingInvitations),
    eaCard,
    performance: performanceSlot(facts),
    bottomLeft: bottomLeftSlot(facts),
    bottomRight: competitionsSlot(facts.competitions),
  };
}

function resolveHeaderCta(facts: PlayerHomeFacts): PlayerHomeHeaderCta {
  if (facts.matches.kind === "some") return "matches";
  if (facts.ea.kind === "linked" && facts.matches.kind === "none") return "refresh-matches";
  if (facts.ea.kind === "unlinked" && facts.competitions.length > 0) return "competitions";
  return null;
}

function heroSlot(facts: PlayerHomeFacts): PlayerHomeHeroSlot {
  if (facts.competitions.length === 0) return { kind: "no-competitions" };
  if (facts.nextEncounter) return { kind: "next-encounter", encounter: facts.nextEncounter };
  return { kind: "no-upcoming" };
}

function invitationsSlot(pendingInvitations: number): PlayerHomeInvitationsSlot {
  return pendingInvitations > 0
    ? { kind: "pending", count: pendingInvitations }
    : { kind: "empty" };
}

function eaSlot(ea: PlayerHomeEa): PlayerHomeEaSlot {
  return ea.kind === "linked" ? { kind: "linked", gamertag: ea.gamertag } : { kind: "unlinked" };
}

function performanceSlot(facts: PlayerHomeFacts): PlayerHomePerformanceSlot {
  if (facts.ea.kind === "unlinked") return { kind: "locked" };
  return facts.matches.kind === "some"
    ? { kind: "stats", profile: facts.gameProfile }
    : { kind: "empty-matches" };
}

function bottomLeftSlot(facts: PlayerHomeFacts): PlayerHomeBottomLeftSlot {
  if (facts.ea.kind === "unlinked") return { kind: "locked" };
  return facts.matches.kind === "some"
    ? { kind: "last-match", last: facts.matches.last }
    : { kind: "empty-matches" };
}

function competitionsSlot(
  competitions: readonly AccessibleCompetitionDto[],
): PlayerHomeBottomRightSlot {
  return competitions.length > 0 ? { kind: "list", competitions } : { kind: "empty" };
}
