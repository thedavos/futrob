export type ResolutionMode = "independent_matches" | "aggregate_score";

export interface CompetitionMatchRules {
  readonly officialMatchesPerEncounter: 1 | 2;
  readonly resolutionMode: ResolutionMode;
  readonly winPoints: number;
  readonly drawPoints: number;
  readonly lossPoints: number;
  readonly allowRescheduling: boolean;
  readonly maxReschedulesPerTeam: number | null;
  readonly minimumRescheduleNoticeHours: number;
  readonly rescheduleRequiresOpponentApproval: boolean;
  readonly rescheduleRequiresOrganizerApproval: boolean;
}
