import type {
  CompetitionFormatDto,
  CompetitionStatusDto,
  RankingKindDto,
  RosterMembershipRoleDto,
} from "@futrob/api-contracts";
import type { FixtureRoundName, FixtureSide, FixtureStageKind, RulesStageLabel } from "@futrob/sdk";
import type { MobileLanguage } from "@/modules/identity/mobile-copy";
import { en } from "./competition-copy-en";
import { es } from "./competition-copy-es";

/** Copy of the competition read views. Wording follows the web catalog (`catalogs.ts`). */
type ReadStateCopy = {
  readonly loading: string;
  readonly error: string;
  readonly refreshError: string;
};

type RefusalCopy = { readonly title: string; readonly description: string };

export type CompetitionCopy = {
  readonly back: string;
  readonly retry: string;
  readonly forbidden: RefusalCopy;
  readonly notFound: RefusalCopy;
  readonly accessError: string;
  readonly stage: Record<FixtureStageKind | RulesStageLabel, string>;
  readonly round: (name: FixtureRoundName) => string;
  readonly side: (side: FixtureSide) => string;
  readonly ordinal: (rank: number) => string;
  readonly fixture: ReadStateCopy & {
    readonly title: string;
    readonly emptyTitle: string;
    readonly emptyDescription: string;
    readonly timeZone: (zone: string) => string;
    readonly bye: (team: string) => string;
    readonly closed: string;
    readonly withdrawn: string;
    readonly group: (group: string) => string;
    readonly slots: (count: number) => string;
    readonly roundPending: string;
    readonly matchup: (home: string, away: string) => string;
  };
  readonly bracket: ReadStateCopy & {
    readonly title: string;
    readonly emptyTitle: string;
    readonly emptyDescription: string;
    readonly noBracketTitle: string;
    readonly noBracketDescription: string;
    readonly calendarLink: string;
    readonly twoLegs: string;
  };
  readonly standings: ReadStateCopy & {
    readonly title: string;
    readonly emptyTitle: string;
    readonly emptyDescription: string;
    readonly forbiddenTitle: string;
    readonly forbiddenDescription: string;
    readonly teamUnresolved: string;
    readonly updated: (time: string) => string;
    readonly playoffCut: (count: number) => string;
    readonly columns: {
      readonly played: string;
      readonly goalDifference: string;
      readonly points: string;
    };
    readonly row: (input: {
      position: number;
      team: string;
      played: number;
      goalDifference: number;
      points: number;
    }) => string;
    readonly swissRound: (current: number, total: number) => string;
    readonly swissBetween: (completed: number, total: number) => string;
    readonly swissFinal: string;
    readonly withdrawn: string;
  };
  readonly rankings: ReadStateCopy & {
    readonly title: string;
    readonly kinds: string;
    readonly kind: Record<RankingKindDto, string>;
    readonly metric: Record<RankingKindDto, string>;
    readonly criterion: Record<RankingKindDto, string>;
    readonly notComputedTitle: string;
    readonly notComputedDescription: string;
    readonly emptyTitle: string;
    readonly emptyDescription: string;
    readonly forbiddenTitle: string;
    readonly forbiddenDescription: string;
    readonly playerUnnamed: string;
    readonly teamNone: string;
    readonly teamUnnamed: string;
    readonly namesLoading: string;
    readonly namesError: string;
    readonly namesRestricted: string;
    readonly matches: (count: number) => string;
  };
  readonly teams: ReadStateCopy & {
    readonly title: string;
    readonly emptyTitle: string;
    readonly emptyDescription: string;
    readonly loadMore: string;
    readonly members: (count: number, max: number) => string;
    readonly rosterOpen: string;
    readonly rosterClosed: string;
    readonly club: (name: string) => string;
    readonly noClub: string;
    readonly roster: string;
    readonly emptyRoster: string;
    readonly role: Record<RosterMembershipRoleDto, string>;
    readonly entry: Record<string, string>;
  };
  readonly rules: ReadStateCopy & {
    readonly title: string;
    readonly status: Record<CompetitionStatusDto, string>;
    readonly noticeDraft: string;
    readonly noticeLocked: string;
    readonly formatTitle: string;
    readonly formatLabel: string;
    readonly format: Record<CompetitionFormatDto, string>;
    readonly teams: string;
    readonly teamsRange: (min: number, max: number | null) => string;
    readonly scoring: string;
    readonly win: string;
    readonly draw: string;
    readonly loss: string;
    readonly encounter: string;
    readonly matchesPerEncounter: string;
    readonly matches: (count: number) => string;
    readonly resolution: string;
    readonly aggregate: string;
    readonly independent: string;
    readonly reschedule: string;
    readonly rescheduleNotAllowed: string;
    readonly rescheduleMax: string;
    readonly unlimited: string;
    readonly rescheduleNotice: string;
    readonly rescheduleExpiry: string;
    readonly hours: (count: number) => string;
    readonly opponentApproval: string;
    readonly organizerApproval: string;
    readonly required: string;
    readonly notRequired: string;
    readonly rosterTitle: string;
    readonly rosterMax: string;
    readonly rosterDefault: string;
    readonly players: (count: number) => string;
    readonly tiebreaksTitle: string;
    readonly tiebreaksDescription: string;
    readonly tiebreak: Record<"points" | "buchholz" | "goalDifference" | "goalsFor", string>;
  };
};

export function competitionCopy(language: MobileLanguage): CompetitionCopy {
  return language === "es" ? es : en;
}
