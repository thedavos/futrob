import type { CompetitionDraftDto, CompetitionMatchRulesDto } from "@futrob/api-contracts";

export const regularRules: CompetitionMatchRulesDto = {
  officialMatchesPerEncounter: 1,
  resolutionMode: "independent_matches",
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  allowRescheduling: true,
  maxReschedulesPerTeam: 2,
  minimumRescheduleNoticeHours: 24,
  rescheduleProposalExpiryHours: 12,
  rescheduleRequiresOpponentApproval: true,
  rescheduleRequiresOrganizerApproval: false,
};

export const leaguePlayoffsDraft: CompetitionDraftDto = {
  competition: {
    id: "competition-1",
    organizationId: "org-1",
    name: "Copa Interclubes",
    status: "draft",
    modality: "fc-clubs",
    gameEdition: "FC 26",
    platform: "pc",
    region: "south-america",
    timeZone: "America/Lima",
    format: "league-playoffs",
    teams: { min: 4, max: 16 },
    schedule: { startsOn: null, endsOn: null },
    cover: { kind: "preset", preset: "league" },
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-02T10:00:00.000Z",
  },
  rules: {
    version: 1,
    regularStage: regularRules,
    knockoutStage: {
      ...regularRules,
      officialMatchesPerEncounter: 2,
      resolutionMode: "aggregate_score",
      maxReschedulesPerTeam: null,
      rescheduleProposalExpiryHours: 6,
      rescheduleRequiresOrganizerApproval: true,
    },
    awayGoalsEnabled: false,
    maxRosterSize: 11,
    rankingEligibility: null,
    createdAt: "2026-10-01T10:00:00.000Z",
  },
};

export const leagueDraft: CompetitionDraftDto = {
  competition: {
    ...leaguePlayoffsDraft.competition,
    format: "league",
    teams: { min: 4, max: null },
  },
  rules: {
    ...leaguePlayoffsDraft.rules,
    regularStage: { ...regularRules, allowRescheduling: false },
    knockoutStage: null,
    maxRosterSize: null,
  },
};

export const publishedDraft: CompetitionDraftDto = {
  ...leaguePlayoffsDraft,
  competition: { ...leaguePlayoffsDraft.competition, status: "published" },
};
