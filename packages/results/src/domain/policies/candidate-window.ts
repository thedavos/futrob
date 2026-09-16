export interface CandidateWindow {
  readonly from: Date;
  readonly to: Date;
}

export const CANDIDATE_WINDOW_HALF_HOURS = 6;

const HOUR_MS = 60 * 60 * 1_000;

export function candidateWindowFor(scheduledStartAt: Date): CandidateWindow {
  const halfWindowMs = CANDIDATE_WINDOW_HALF_HOURS * HOUR_MS;
  return {
    from: new Date(scheduledStartAt.getTime() - halfWindowMs),
    to: new Date(scheduledStartAt.getTime() + halfWindowMs),
  };
}
