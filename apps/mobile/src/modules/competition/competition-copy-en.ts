import type { FixtureRoundName } from "@futrob/sdk";
import type { CompetitionCopy } from "./competition-copy";

function englishOrdinal(rank: number): string {
  const mod100 = rank % 100;
  const mod10 = rank % 10;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : mod10 === 1
        ? "st"
        : mod10 === 2
          ? "nd"
          : mod10 === 3
            ? "rd"
            : "th";
  return `${rank}${suffix}`;
}

const enStage = {
  league: "League",
  groups: "Groups",
  knockout: "Knockout",
  playoffs: "Playoffs",
  swiss: "Swiss stage",
} as const;

function enRound(name: FixtureRoundName): string {
  switch (name.kind) {
    case "matchday":
      return `Matchday ${name.number}`;
    case "final":
      return "Final";
    case "semifinal":
      return "Semi-finals";
    case "quarterfinal":
      return "Quarter-finals";
    case "roundOf16":
      return "Round of 16";
    case "round":
      return `Round ${name.number}`;
  }
}

function enWinner(from: { round: FixtureRoundName; order: number }): string {
  switch (from.round.kind) {
    case "final":
      return "Winner of the final";
    case "semifinal":
      return `Winner of semi-final ${from.order}`;
    case "quarterfinal":
      return `Winner of quarter-final ${from.order}`;
    case "roundOf16":
      return `Winner of round of 16 tie ${from.order}`;
    case "matchday":
      return `Winner of matchday ${from.round.number}, tie ${from.order}`;
    case "round":
      return `Winner of round ${from.round.number}, tie ${from.order}`;
  }
}

export const en: CompetitionCopy = {
  back: "Back",
  retry: "Try again",
  forbidden: {
    title: "You don't have access",
    description: "Your role in this competition doesn't allow you to see this section.",
  },
  notFound: {
    title: "Competition unavailable",
    description: "It doesn't exist or is no longer one of your spaces.",
  },
  accessError: "We couldn't check your access.",
  stage: enStage,
  round: enRound,
  ordinal: englishOrdinal,
  side: (side) => {
    switch (side.kind) {
      case "team":
        return side.name ?? "Team unavailable";
      case "bye":
        return "Bye";
      case "winner":
        return side.from ? enWinner(side.from) : "Winner to be decided";
      case "groupRank":
        return `${englishOrdinal(side.rank)} in group ${side.group}`;
      case "stageRank":
        return `${englishOrdinal(side.rank)} in ${enStage[side.stage]}`;
    }
  },
  fixture: {
    title: "Schedule",
    loading: "Loading the schedule",
    error: "We couldn't load the schedule.",
    refreshError: "We couldn't refresh the schedule. You're seeing the last good read.",
    emptyTitle: "No schedule yet",
    emptyDescription: "Once the fixture is generated, you'll see each stage and its rounds here.",
    timeZone: (zone) => `Times in ${zone}`,
    bye: (team) => `${team} rests`,
    closed: "Not played",
    withdrawn: "Withdrawn",
    group: (group) => `Group ${group}`,
    slots: (count) => (count === 1 ? "1 match" : `${count} matches`),
    roundPending: "Paired once the previous round is official",
    matchup: (home, away) => `${home} vs ${away}`,
  },
  bracket: {
    title: "Bracket",
    loading: "Loading the bracket",
    error: "We couldn't load the bracket.",
    refreshError: "We couldn't refresh the bracket. You're seeing the last good read.",
    emptyTitle: "No bracket yet",
    emptyDescription: "Once the fixture is generated, you'll see the knockout rounds here.",
    noBracketTitle: "This competition has no knockout rounds",
    noBracketDescription: "Its format is played as a table. Check the schedule.",
    calendarLink: "View schedule",
    twoLegs: "Two legs",
  },
  standings: {
    title: "Standings",
    loading: "Loading the standings",
    error: "We couldn't load the standings.",
    refreshError: "We couldn't refresh the standings. You're seeing the last good read.",
    emptyTitle: "No official standings yet",
    emptyDescription: "They appear once the first official result is approved.",
    forbiddenTitle: "You don't have access to the standings",
    forbiddenDescription: "Your role in this competition doesn't allow you to see its statistics.",
    teamUnresolved: "Team name unavailable",
    updated: (time) => `Updated ${time}`,
    playoffCut: (count) =>
      count === 1 ? "The top team reaches the playoffs" : `The top ${count} reach the playoffs`,
    columns: { played: "P", goalDifference: "GD", points: "Pts" },
    row: ({ position, team, played, goalDifference, points }) =>
      `${englishOrdinal(position)} ${team}: ${points} points, ${played} played, goal difference ${goalDifference}`,
    swissRound: (current, total) => `Round ${current} of ${total}`,
    swissBetween: (completed, total) => `Official rounds: ${completed} of ${total}`,
    swissFinal: "Final standings",
    withdrawn: "Withdrawn",
  },
  rankings: {
    title: "Rankings",
    loading: "Loading rankings…",
    error: "We couldn't load the rankings.",
    refreshError: "We couldn't refresh the rankings. You're seeing the last good read.",
    kinds: "Ranking type",
    kind: {
      scorer: "Scorers",
      assister: "Assists",
      rating: "Rating",
      mvp: "MVP",
      goalkeeper: "Goalkeepers",
    },
    metric: {
      scorer: "Goals",
      assister: "Assists",
      rating: "Average rating",
      mvp: "MVP awards",
      goalkeeper: "Saves",
    },
    criterion: {
      scorer: "Most goals in approved official matches.",
      assister: "Most assists in approved official matches.",
      rating: "Best average rating in approved official matches.",
      mvp: "Most MVP awards in approved official matches.",
      goalkeeper: "Most saves in approved official matches.",
    },
    notComputedTitle: "No rankings yet",
    notComputedDescription: "They're calculated once official results are approved.",
    emptyTitle: "No one qualifies for this ranking yet",
    emptyDescription: "No player meets the minimum matches and minutes yet.",
    forbiddenTitle: "You don't have access to the rankings",
    forbiddenDescription: "Your role in this competition doesn't allow you to see its statistics.",
    playerUnnamed: "Player without a visible name",
    teamNone: "No team",
    teamUnnamed: "Team without a visible name",
    namesLoading: "Loading name",
    namesError: "We couldn't load player and team names.",
    namesRestricted: "Some names are hidden because you can't see those rosters.",
    matches: (count) => (count === 1 ? "1 match" : `${count} matches`),
  },
  teams: {
    title: "Teams",
    loading: "Loading teams",
    error: "We couldn't load the teams.",
    refreshError: "We couldn't refresh the teams. You're seeing the last good read.",
    emptyTitle: "No teams yet",
    emptyDescription: "Teams appear here once they register for the competition.",
    loadMore: "Load more teams",
    members: (count, max) => `${count} of ${max} players`,
    rosterOpen: "Roster open",
    rosterClosed: "Roster closed",
    club: (name) => `EA club: ${name}`,
    noClub: "No EA club linked",
    roster: "Roster",
    emptyRoster: "This roster has no players yet.",
    role: { captain: "Captain", vice_captain: "Vice captain", player: "Player" },
    entry: {
      pending: "Entry pending",
      approved: "Entry approved",
      rejected: "Entry rejected",
      withdrawn: "Entry withdrawn",
    },
  },
  rules: {
    title: "Rules",
    loading: "Loading the rules…",
    error: "We couldn't load the rules.",
    refreshError: "We couldn't refresh the rules. You're seeing the last good read.",
    status: {
      draft: "Draft",
      registration: "Registration open",
      published: "Published",
      paused: "Paused",
      finished: "Finished",
      archived: "Archived",
    },
    noticeDraft: "Draft: these rules can still change before publishing.",
    noticeLocked: "These rules were locked when the competition was published.",
    formatTitle: "Format",
    formatLabel: "Competition type",
    format: {
      league: "League",
      knockout: "Knockout",
      "groups-knockout": "Groups + knockout",
      "league-playoffs": "League + playoffs",
      swiss: "Swiss system",
    },
    teams: "Teams",
    teamsRange: (min, max) => (max === null ? `From ${min}` : `${min} to ${max}`),
    scoring: "Scoring",
    win: "Win",
    draw: "Draw",
    loss: "Loss",
    encounter: "Encounter",
    matchesPerEncounter: "Matches per tie",
    matches: (count) => (count === 1 ? "1 match" : `${count} matches`),
    resolution: "Resolution",
    aggregate: "Aggregate score",
    independent: "Each match counts on its own",
    reschedule: "Rescheduling",
    rescheduleNotAllowed: "Rescheduling isn't allowed",
    rescheduleMax: "Maximum per team",
    unlimited: "No limit",
    rescheduleNotice: "Minimum notice",
    rescheduleExpiry: "Time to answer a proposal",
    hours: (count) => (count === 1 ? "1 hour" : `${count} hours`),
    opponentApproval: "Opponent approval",
    organizerApproval: "Organizer approval",
    required: "Required",
    notRequired: "Not required",
    rosterTitle: "Roster",
    rosterMax: "Maximum players",
    rosterDefault: "Default limit",
    players: (count) => (count === 1 ? "1 player" : `${count} players`),
    tiebreaksTitle: "Tiebreak criteria",
    tiebreaksDescription: "Applied in this order.",
    tiebreak: {
      points: "Points",
      buchholz: "Buchholz",
      goalDifference: "Goal difference",
      goalsFor: "Goals for",
    },
  },
};
