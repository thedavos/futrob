import type { RescheduleCopy } from "./reschedule-copy";

export const en: RescheduleCopy = {
  title: "Rescheduling",
  description: "Review proposals and resolve escalated requests. Silence never accepts a change.",
  back: "Back",
  close: "Close",
  cancel: "Cancel",
  retry: "Try again",
  vs: "vs",
  encounterLoading: "Loading the encounter…",
  encounterError: "We could not load the encounter.",
  encounterNotFound: "Encounter unavailable",
  encounterNotFoundHelp: "It is not in this competition or you do not have access to it.",
  loading: "Loading reschedule requests…",
  empty: "No reschedule requests",
  emptyHelp: "Requests and their decisions will appear here.",
  forbidden: "You do not have access to the reschedule history.",
  error: "We could not load the reschedule requests.",
  refresh: "Refresh reschedule requests",
  refreshFailed: "We could not refresh the history. The displayed data may have changed.",
  paused: "Refresh the reschedule requests to send. Your draft is kept.",
  status: {
    open: "In negotiation",
    accepted: "Schedule applied by consent",
    rejected: "Rejected",
    cancelled: "Cancelled",
    expired: "Expired",
    escalated: "Escalated to the organizer",
    resolved_by_organizer: "Resolved by the organizer",
  },
  scopeEncounter: "Entire encounter",
  scopeSlot: (slot) => `Match ${slot}`,
  proposedBy: (team) => `Proposal from ${team}`,
  proposedStart: "Proposed kickoff",
  deadline: (date) => `Response deadline: ${date}`,
  summary: {
    pending: (team, scope, from, to) =>
      `${team} proposes moving ${scopePhrase(scope)} from ${from} to ${to}.`,
    applied: (scope, from, to) => `${capitalize(scopePhrase(scope))} moved from ${from} to ${to}.`,
    closed: (team, scope, to) => `${team} proposed moving ${scopePhrase(scope)} to ${to}.`,
  },
  respondBy: (date) => `Respond by ${date}.`,
  history: "Show proposal and decision history",
  hideHistory: "Hide history",
  proposal: (number) => `Proposal ${number}`,
  consent: (actor) => `Consent from ${actor}`,
  rejection: (actor) => `Rejection from ${actor}`,
  organizer: "Organizer",
  system: "System",
  expiredAt: (deadline, processed) =>
    `Response window closed at ${deadline}; escalation processed at ${processed}.`,
  resolvedAt: (date, actor) => `Resolution recorded at ${date} by ${actor}.`,
  noPermission: "Only an operator with permission to resolve can close this escalated request.",
  resolve: "Resolve escalated request",
  outcome: "Outcome",
  outcomes: {
    schedule_set: "Set a new date",
    schedule_kept: "Keep the schedule",
    walkover_intended: "Record walkover intention",
  },
  outcomeHelp: {
    schedule_set:
      "Applies the new date to the requested scope and consumes allowance from the Team that opened the request.",
    schedule_kept: "Keeps the current schedule and closes the request without consuming allowance.",
    walkover_intended:
      "Records an intention only. It creates no official result and changes no statistics, standings or bracket.",
  },
  reason: "Resolution reason",
  reasonRequired: "Enter a reason to close the request.",
  newStart: "New date and time",
  date: "Date",
  dateHint: "YYYY-MM-DD",
  time: "Time",
  timeHint: "HH:MM, 24-hour",
  zone: (zone) => `Competition time: ${zone}`,
  dateInvalid: "Enter a valid date in the competition time zone.",
  winningTeam: "Winning Team for the intention",
  winnerRequired: "Choose a winning Team to record the intention.",
  save: "Save resolution",
  success: "Resolution saved. The history reflects the closed request.",
  currentStart: "Current kickoff",
  preview: (date) => `Saved as ${date}`,
  create: {
    open: "Request reschedule",
    title: "New reschedule request",
    team: "Requesting Team",
    actingAs: (team) => `You request on behalf of ${team}`,
    scope: "What moves",
    currentStart: (date) => `Now: ${date}`,
    reason: "Reason for the rival",
    reasonRequired: "Enter a reason for the rival.",
    help: "The rival must accept before the deadline. If they do not answer, the request goes to the organizer: silence is not acceptance.",
    submit: "Send request",
    success: "Request sent. The schedule stays the same until the rival accepts.",
    blocked: {
      permission: "Only a captain of a Team in this encounter can request a reschedule.",
      rescheduling_disabled: "This competition does not allow rescheduling.",
      limit_reached: (team) => `${team} has used all its reschedules.`,
      active_request_exists: "An active request already covers this kickoff.",
      result_protected: "A protected result selection prevents changes to this kickoff.",
    },
  },
  recovery: {
    review: "The proposal changed. Review the current proposal before answering.",
    windowClosed:
      "Your answer arrived after the deadline and was not recorded. The organizer decides the request.",
    resultProtected: "This kickoff has an approved result and can no longer move.",
    disabled: "This competition no longer allows rescheduling.",
    limitReached: "Your Team has used all its reschedules.",
    permission: "You no longer have permission for this action. The list has been refreshed.",
    activeRequest: "An active request already covers this kickoff. Review it in the list.",
    noticeProposed: "The new date does not meet the minimum notice. Choose a later date.",
    noticeCurrent: "The match is too close to reschedule; the current kickoff stays.",
    acceptNotice:
      "The proposed date no longer meets the minimum notice. Counter with another date or reject the proposal.",
    acceptPast: "The proposed date has passed. Counter with another date or reject the proposal.",
    dateRejected: "Choose a future date that differs from the current kickoff.",
    network: "We could not send the action. Try again; it will not apply twice.",
    unknown: "Something went wrong. Try again.",
  },
  respondAs: (team) => `You respond as ${team}`,
  actions: {
    accept: {
      open: "Accept",
      title: "Accept the proposal",
      submit: "Confirm acceptance",
      success: () =>
        "Acceptance recorded. The request status shows whether the schedule has moved.",
    },
    reject: {
      open: "Reject",
      title: "Reject the proposal",
      submit: "Confirm rejection",
      success: () => "Proposal rejected. The current schedule stays.",
    },
    counter: {
      open: "Counter",
      title: "Counter with another date",
      submit: "Send counter",
      success: (team) => `Counter sent. ${team} must answer before the deadline.`,
    },
  },
  acceptBody: (scope, from, to) => `${scope} moves from ${from} to ${to}.`,
  rejectBody: (date) => `The current schedule stays: ${date}.`,
  rejectReason: "Reason (optional)",
  counterActingAs: (team) => `You counter as ${team}`,
  counterBody: (team) => `${team} will need to consent again.`,
  counterReason: "Counter reason",
  counterReasonRequired: "Enter a reason for the counter.",
  blocked: {
    response_window_closed:
      "The response window closed. The request goes to the organizer; silence is not acceptance.",
    own_proposal: "Your Team made this proposal. Wait for the rival's answer.",
    permission: "Only the rival captain or the organizer can answer this proposal.",
    already_consented: "You already consented to this proposal.",
    rescheduling_disabled:
      "The competition does not allow rescheduling, so you cannot accept or counter.",
    result_protected: "This kickoff has an approved result, so you cannot accept or counter.",
  },
  stale: "The proposal changed while you were answering. Cancel and review the current proposal.",
};

/** «Entire encounter» → «the whole encounter», «Match 2» → «match 2», as web's sentences read. */
function scopePhrase(scope: string): string {
  return scope === "Entire encounter" ? "the whole encounter" : scope.toLowerCase();
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
