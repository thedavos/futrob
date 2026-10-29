import type {
  ActivityEntryDto,
  CompetitionDto,
  CompetitionEncounterDto,
  CompetitionEntryDto,
  CompetitionTeamManagementSummaryDto,
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
  gameEdition: "FC 26",
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

function encounter(
  number: number,
  home: string,
  away: string,
  scheduledStartAt: string,
  status: CompetitionEncounterDto["status"],
): CompetitionEncounterDto {
  return {
    encounterId: `${OVERVIEW_COMPETITION_ID}:encounter:${number}`,
    round: { number, total: 6 },
    scheduledStartAt,
    officialMatchCount: 1,
    home: { teamId: home.toLowerCase(), name: home },
    away: { teamId: away.toLowerCase(), name: away },
    status,
  };
}

/** Deliberately out of order, so the overview has to sort by kickoff itself. */
export const overviewEncounters: ListCompetitionEncountersResponse = {
  competition: { id: OVERVIEW_COMPETITION_ID, name: "Liga Nocturna", timeZone: "America/Lima" },
  encounters: [
    encounter(4, "Halcones", "Titans", "2026-10-30T01:00:00.000Z", "scheduled"),
    encounter(1, "Cuervos FC", "Nova FC", "2026-10-13T01:00:00.000Z", "official"),
    encounter(3, "Orion", "Atlas", "2026-10-23T01:00:00.000Z", "scheduled"),
    encounter(2, "Nova FC", "Orion", "2026-10-18T01:00:00.000Z", "awaiting_result"),
    encounter(5, "Atlas", "Cuervos FC", "2026-11-06T01:00:00.000Z", "scheduled"),
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
    externalClub: null,
  };
}

export const overviewTeams: readonly CompetitionTeamManagementSummaryDto[] = [
  teamSummary(overviewEntries[0]!, "Cuervos FC", 9),
  teamSummary(overviewEntries[1]!, "Nova FC", 11),
  teamSummary(overviewEntries[2]!, "Atlas", 4),
  teamSummary(overviewEntries[3]!, "Rechazado SC", 0),
];

function activity(
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
    },
    openedAt: "2026-10-19T10:00:00.000Z",
    closedAt: null,
    expiresAt: null,
    lastEventAt: "2026-10-19T10:00:00.000Z",
    ...overrides,
  };
}

export const overviewActivities: readonly ActivityEntryDto[] = [
  activity({ id: "dispute", kind: "match_dispute" }),
  activity({
    id: "selection-closed",
    kind: "selection_confirmation",
    status: "closed",
    requiresAction: false,
    closedAt: "2026-10-19T12:00:00.000Z",
  }),
];
