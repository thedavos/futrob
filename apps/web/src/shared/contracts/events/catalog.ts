/**
 * Versioned cross-module event names.
 * Payloads live beside producers; consumers depend on this catalog + typed events.
 */
export const FutrobEventNames = {
  memberRoleChanged: "organizations.member-role-changed",
  competitionCreated: "competitions.competition-created",
  competitionStarted: "competitions.competition-started",
  externalClubConnected: "teams.external-club-connected",
  rosterLocked: "teams.roster-locked",
  encounterCreated: "scheduling.encounter-created",
  rescheduleRequested: "scheduling.reschedule-requested",
  encounterRescheduled: "scheduling.encounter-rescheduled",
  encounterReadyForSync: "scheduling.encounter-ready-for-sync",
  providerMatchesSynced: "game-data.provider-matches-synced",
  providerMatchDiscovered: "game-data.provider-match-discovered",
  officialMatchesSelected: "results.official-matches-selected",
  officialSelectionConfirmed: "results.official-selection-confirmed",
  matchDisputeOpened: "results.match-dispute-opened",
  officialResultApproved: "results.official-result-approved",
  officialResultVoided: "results.official-result-voided",
  competitionStatsRebuilt: "statistics.competition-stats-rebuilt",
  rankingsUpdated: "statistics.rankings-updated",
  analyticsSnapshotGenerated: "analytics.snapshot-generated",
} as const;

export type FutrobEventName = (typeof FutrobEventNames)[keyof typeof FutrobEventNames];
