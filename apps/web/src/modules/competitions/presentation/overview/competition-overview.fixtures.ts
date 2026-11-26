import type {
  ActivityEntryDto,
  CompetitionDto,
  CompetitionEncounterDto,
  CompetitionEntryDto,
  CompetitionTeamManagementSummaryDto,
  EncounterMatchScoreDto,
  ListCompetitionEncountersResponse,
} from "@futrob/api-contracts";

export const OVERVIEW_ORG_ID = "org-1";
export const OVERVIEW_COMPETITION_ID = "cmp-1";
export const OVERVIEW_NOW = new Date("2026-10-20T12:00:00.000Z");

export const overviewCompetition: CompetitionDto = {
  id: OVERVIEW_COMPETITION_ID,
  organizationId: OVERVIEW_ORG_ID,
  name: "Liga Nocturna",
  status: "published",
  modality: "fc-clubs",
  exploreListing: "listed",
  gameEdition: "fc26",
  platform: "playstation",
  region: "south-america",
  timeZone: "America/Lima",
  format: "league",
  teams: { min: 2, max: 8 },
  schedule: { startsOn: "2026-10-12", endsOn: "2026-12-20" },
  cover: { kind: "preset", preset: "league" },
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-10-05T12:00:00.000Z",
};

export const finishedCompetition: CompetitionDto = {
  ...overviewCompetition,
  name: "Torneo Verano 25",
  status: "finished",
  format: "league-playoffs",
  cover: { kind: "preset", preset: "cup" },
  schedule: { startsOn: "2026-06-08", endsOn: null },
};

function encounter(
  number: number,
  home: string,
  away: string,
  scheduledStartAt: string,
  status: CompetitionEncounterDto["status"],
  score: EncounterMatchScoreDto[] | null = null,
): CompetitionEncounterDto {
  return {
    encounterId: `${OVERVIEW_COMPETITION_ID}:encounter:${number}`,
    round: {
      id: `${OVERVIEW_COMPETITION_ID}:stage:1:round:${number}`,
      number,
      total: 6,
      stage: { id: `${OVERVIEW_COMPETITION_ID}:stage:1`, kind: "league", order: 1 },
    },
    scheduledStartAt,
    officialMatchCount: score && score.length === 2 ? 2 : 1,
    resolutionMode: score && score.length === 2 ? "aggregate_score" : null,
    home: { teamId: home.toLowerCase(), name: home },
    away: { teamId: away.toLowerCase(), name: away },
    status,
    score,
  };
}

/** Deliberately out of order, so the overview has to sort by kickoff itself. */
export const overviewEncounters: ListCompetitionEncountersResponse = {
  competition: { id: OVERVIEW_COMPETITION_ID, name: "Liga Nocturna", timeZone: "America/Lima" },
  encounters: [
    encounter(4, "Halcones", "Titans", "2026-10-30T01:00:00.000Z", "scheduled"),
    encounter(1, "Cuervos FC", "Nova FC", "2026-10-13T01:00:00.000Z", "official", [
      { homeGoals: 2, awayGoals: 1 },
    ]),
    encounter(3, "Orion", "Atlas", "2026-10-23T01:00:00.000Z", "scheduled"),
    encounter(2, "Nova FC", "Orion", "2026-10-18T01:00:00.000Z", "awaiting_result"),
    encounter(5, "Atlas", "Cuervos FC", "2026-11-06T01:00:00.000Z", "scheduled"),
  ],
};

export const finishedEncounters: ListCompetitionEncountersResponse = {
  competition: { id: OVERVIEW_COMPETITION_ID, name: "Torneo Verano 25", timeZone: "America/Lima" },
  encounters: [
    encounter(5, "Atlético Pumas", "Inti United", "2026-06-13T23:00:00.000Z", "official", [
      { homeGoals: 1, awayGoals: 3 },
    ]),
    encounter(6, "Cóndores FC", "Sporting Quipu", "2026-06-14T23:00:00.000Z", "official", [
      { homeGoals: 2, awayGoals: 1 },
    ]),
    encounter(4, "Deportivo Llama", "Real Vicuña", "2026-06-12T23:00:00.000Z", "official", [
      { homeGoals: 2, awayGoals: 0 },
      { homeGoals: 1, awayGoals: 1 },
    ]),
  ],
};

function entry(
  teamId: string,
  status: CompetitionEntryDto["status"],
  createdAt: string,
): CompetitionEntryDto {
  return {
    id: `entry-${teamId}`,
    organizationId: OVERVIEW_ORG_ID,
    competitionId: OVERVIEW_COMPETITION_ID,
    teamId,
    status,
    createdAt,
  };
}

export const overviewEntries: readonly CompetitionEntryDto[] = [
  entry("cuervos", "approved", "2026-10-01T12:00:00.000Z"),
  entry("nova", "approved", "2026-10-02T12:00:00.000Z"),
  entry("atlas", "pending", "2026-10-15T12:00:00.000Z"),
  entry("rechazado", "rejected", "2026-10-03T12:00:00.000Z"),
];

function teamSummary(
  entryValue: CompetitionEntryDto,
  name: string,
  memberCount: number,
  externalClubName: string | null = null,
): CompetitionTeamManagementSummaryDto {
  return {
    team: {
      id: entryValue.teamId,
      organizationId: OVERVIEW_ORG_ID,
      name,
      createdAt: "2026-09-01T12:00:00.000Z",
    },
    entry: entryValue,
    roster: { state: "open", memberCount, maxSize: 11, lockedAt: null },
    externalClub: externalClubName
      ? {
          teamId: entryValue.teamId,
          providerKey: "ea-clubs",
          externalClubId: `ea-${entryValue.teamId}`,
          externalClubName,
          platform: "playstation",
          gameEdition: "fc26",
        }
      : null,
  };
}

export const overviewTeams: readonly CompetitionTeamManagementSummaryDto[] = [
  teamSummary(overviewEntries[0]!, "Cuervos FC", 9, "Cuervos Clubs"),
  teamSummary(overviewEntries[1]!, "Nova FC", 11, "Nova Esports"),
  teamSummary(overviewEntries[2]!, "Atlas", 4, null),
  teamSummary(overviewEntries[3]!, "Rechazado SC", 0, null),
];

export function overviewActivity(
  overrides: Partial<ActivityEntryDto> & Pick<ActivityEntryDto, "id" | "kind">,
): ActivityEntryDto {
  return {
    organizationId: OVERVIEW_ORG_ID,
    competitionId: OVERVIEW_COMPETITION_ID,
    audience: "organization",
    status: "open",
    requiresAction: true,
    resourceType: "encounter",
    resourceId: "enc-1",
    subject: {
      competitionName: "Liga Nocturna",
      encounterLabel: "Nova FC vs Orion",
      teamName: null,
      outcome: null,
    },
    openedAt: "2026-10-19T10:00:00.000Z",
    closedAt: null,
    expiresAt: null,
    lastEventAt: "2026-10-19T10:00:00.000Z",
    ...overrides,
  };
}

export const overviewActivities: readonly ActivityEntryDto[] = [
  overviewActivity({ id: "dispute", kind: "match_dispute" }),
  // The notification of the one pending entry: the overview counts that entry once.
  overviewActivity({
    id: "entry-atlas",
    kind: "competition_entry",
    resourceType: "competition",
    resourceId: OVERVIEW_COMPETITION_ID,
    subject: {
      competitionName: "Liga Nocturna",
      encounterLabel: null,
      teamName: "Atlas",
      outcome: null,
    },
  }),
  overviewActivity({
    id: "selection-closed",
    kind: "selection_confirmation",
    status: "closed",
    requiresAction: false,
    closedAt: "2026-10-19T12:00:00.000Z",
  }),
];
