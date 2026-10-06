import type {
  ScheduleChangeRequest,
  ScheduleChangeRequestStatus,
} from "../entities/schedule-change-request.ts";

/**
 * The request as one past command left it. History is append-only and every
 * command bumps the version, so the proposals up to the one current after that
 * command and the decisions answered before its resulting version are exactly
 * that state; later transitions are excluded.
 */
export function scheduleChangeRequestAsOf(
  request: ScheduleChangeRequest,
  outcome: {
    readonly version: number;
    readonly status: ScheduleChangeRequestStatus;
    readonly currentProposalId: string;
    readonly at: Date;
  },
): ScheduleChangeRequest {
  const last = request.proposals.findIndex((proposal) => proposal.id === outcome.currentProposalId);
  const [first, ...rest] = request.proposals.slice(0, last + 1);
  return {
    ...request,
    status: outcome.status,
    version: outcome.version,
    proposals: first ? [first, ...rest] : request.proposals,
    decisions: request.decisions.filter((decision) => decision.requestVersion < outcome.version),
    application:
      request.application && request.application.requestVersion <= outcome.version
        ? request.application
        : null,
    updatedAt: new Date(outcome.at.getTime()),
  };
}
