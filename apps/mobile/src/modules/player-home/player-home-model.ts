import type {
  AccessibleCompetitionDto,
  GetMyGameProfileResponse,
  GetMyNextEncounterResponse,
  GetMyPlayerProfileResponse,
  GetMyRecentMatchesResponse,
  ListAccessibleCompetitionsResponse,
  ListMyRosterInvitationsResponse,
  NextEncounterDto,
  PlayerExternalClubAssociationDto,
  PlayerGameProfileDto,
  PlayerRecentProviderMatchDto,
} from "@futrob/api-contracts";

export type PlayerHomeFailure =
  | {
      kind: "api";
      status: number;
      code: string;
      messageKey: string;
      requestId: string | undefined;
      retryAfterSeconds: number | undefined;
    }
  | { kind: "timeout"; timeoutMs: number }
  | { kind: "network" }
  | { kind: "contract" };

export type PlayerHomeSource<T> =
  | { kind: "ready"; data: T }
  | { kind: "error"; error: PlayerHomeFailure };

export interface PlayerHomeSnapshot {
  externalClubId: string | undefined;
  profile: PlayerHomeSource<GetMyPlayerProfileResponse>;
  recentMatches: PlayerHomeSource<GetMyRecentMatchesResponse>;
  gameProfile: PlayerHomeSource<GetMyGameProfileResponse>;
  competitions: PlayerHomeSource<ListAccessibleCompetitionsResponse>;
  nextEncounter: PlayerHomeSource<GetMyNextEncounterResponse>;
  invitations: PlayerHomeSource<ListMyRosterInvitationsResponse>;
}

type SourceError = { kind: "error"; error: PlayerHomeFailure };
type Unavailable = { kind: "onboarding" } | { kind: "invalid-club" } | SourceError;
type ProviderSetup = { kind: "needs-club" } | { kind: "needs-game-account" };

export interface PlayerHomeModel {
  kind: "onboarding" | "select-club" | "dashboard" | "invalid-club" | "error";
  selectedClub: PlayerExternalClubAssociationDto | null;
  headerCta: "matches" | "refresh-matches" | "competitions" | null;
  hero:
    | { kind: "next-encounter"; encounter: NextEncounterDto }
    | { kind: "no-upcoming" }
    | { kind: "no-competitions" }
    | { kind: "select-club" }
    | Unavailable;
  invitations: { kind: "pending"; count: number } | { kind: "empty" } | SourceError;
  eaCard: { kind: "linked"; gamertag: string } | { kind: "unlinked" } | SourceError;
  performance:
    | { kind: "stats"; profile: PlayerGameProfileDto }
    | { kind: "empty-matches" }
    | { kind: "locked" }
    | ProviderSetup
    | Unavailable;
  bottomLeft:
    | { kind: "last-match"; last: PlayerRecentProviderMatchDto }
    | { kind: "empty-matches" }
    | { kind: "locked" }
    | ProviderSetup
    | Unavailable;
  bottomRight:
    | { kind: "list"; competitions: AccessibleCompetitionDto[] }
    | { kind: "empty" }
    | SourceError;
}

/** Adapts server facts for presentation; selection and loading belong to the consumer. */
export function resolvePlayerHome(snapshot: PlayerHomeSnapshot): PlayerHomeModel {
  const { profile, competitions, invitations } = snapshot;
  const count =
    invitations.kind === "ready"
      ? invitations.data.invitations.filter((invitation) => invitation.status === "pending").length
      : 0;
  const invitationSlot: PlayerHomeModel["invitations"] =
    invitations.kind === "error"
      ? invitations
      : count > 0
        ? { kind: "pending", count }
        : { kind: "empty" };
  const competitionSlot: PlayerHomeModel["bottomRight"] =
    competitions.kind === "error"
      ? competitions
      : competitions.data.competitions.length > 0
        ? { kind: "list", competitions: competitions.data.competitions }
        : { kind: "empty" };

  if (profile.kind === "error") {
    return {
      kind: "error",
      selectedClub: null,
      headerCta: null,
      hero: profile,
      invitations: invitationSlot,
      eaCard: profile,
      performance: profile,
      bottomLeft: profile,
      bottomRight: competitionSlot,
    };
  }

  const account = profile.data.gameAccounts[0];
  const club = profile.data.externalClubs.find(
    (candidate) => candidate.externalClubId === snapshot.externalClubId,
  );
  const eaCard: PlayerHomeModel["eaCard"] = account
    ? { kind: "linked", gamertag: account.identifier }
    : { kind: "unlinked" };

  if (!club) {
    const kind =
      snapshot.externalClubId !== undefined
        ? "invalid-club"
        : account
          ? "select-club"
          : "onboarding";
    const unavailable: Unavailable =
      kind === "invalid-club" ? { kind: "invalid-club" } : { kind: "onboarding" };
    return {
      kind,
      selectedClub: null,
      headerCta: null,
      hero: kind === "select-club" ? { kind: "select-club" } : unavailable,
      invitations: invitationSlot,
      eaCard,
      performance: unavailable,
      bottomLeft: unavailable,
      bottomRight: competitionSlot,
    };
  }

  const lastMatch = lastMatchSlot(snapshot.recentMatches, Boolean(account));
  return {
    kind: "dashboard",
    selectedClub: club,
    headerCta:
      lastMatch.kind === "last-match"
        ? "matches"
        : lastMatch.kind === "empty-matches"
          ? "refresh-matches"
          : !account && competitions.kind === "ready" && competitions.data.competitions.length > 0
            ? "competitions"
            : null,
    hero: heroSlot(snapshot),
    invitations: invitationSlot,
    eaCard,
    performance: performanceSlot(snapshot.gameProfile, lastMatch),
    bottomLeft: lastMatch,
    bottomRight: competitionSlot,
  };
}

function heroSlot({ competitions, nextEncounter }: PlayerHomeSnapshot): PlayerHomeModel["hero"] {
  if (competitions.kind === "error") return competitions;
  if (competitions.data.competitions.length === 0) return { kind: "no-competitions" };
  if (nextEncounter.kind === "error") return nextEncounter;
  return nextEncounter.data.encounter
    ? { kind: "next-encounter", encounter: nextEncounter.data.encounter }
    : { kind: "no-upcoming" };
}

function lastMatchSlot(
  source: PlayerHomeSnapshot["recentMatches"],
  hasAccount: boolean,
): PlayerHomeModel["bottomLeft"] {
  if (source.kind === "error") return source;
  if (source.data.status === "needs_club") return { kind: "needs-club" };
  if (source.data.status === "needs_game_account") return { kind: "needs-game-account" };
  if (!hasAccount) return { kind: "locked" };
  const last = source.data.matches[0];
  return last ? { kind: "last-match", last } : { kind: "empty-matches" };
}

function performanceSlot(
  source: PlayerHomeSnapshot["gameProfile"],
  lastMatch: PlayerHomeModel["bottomLeft"],
): PlayerHomeModel["performance"] {
  if (source.kind === "error") return source;
  if (source.data.status === "needs_club") return { kind: "needs-club" };
  if (source.data.status === "needs_game_account") return { kind: "needs-game-account" };
  if (lastMatch.kind !== "last-match") return lastMatch;
  return { kind: "stats", profile: source.data.profile };
}
