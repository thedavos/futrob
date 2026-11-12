import type { MatchCenterCopy } from "./match-center-copy";

export const en: MatchCenterCopy = {
  back: "Back",
  vs: "VS",
  round: (number, total) => (total ? `Round ${number} of ${total}` : `Round ${number}`),
  timeZone: (zone) => `Times in ${zone}`,
  loading: "Loading fixture",
  error: "We couldn't load the fixture.",
  notFoundTitle: "Fixture unavailable",
  notFoundDescription: "It isn't in this competition or your account can't access it.",
  retry: "Try again",
  slotsTitle: "Official matches",
  slotsDescription:
    "Assign an EA match to each official match to preview the result before proposing it.",
  slot: (slot) => `Match ${slot}`,
  slotUnassigned: "No EA match assigned",
  slotUnmatched: "The clubs in this EA match aren't the two teams' clubs.",
  slotClear: (slot) => `Remove the EA match from match ${slot}`,
  previewNote:
    "Only on this screen: nothing is saved or made official. The result counts once the opponent confirms the proposal.",
  previewIncomplete: "Assign an EA match to each official match to preview the series.",
  previewAggregate: "Aggregate",
  previewResult: "Result",
  previewIndependent:
    "Each match counts on its own; this competition doesn't use an aggregate score.",
  previewModeUnknown:
    "The competition doesn't define how the series is decided yet; check each score.",
  win: (team) => `${team} wins`,
  draw: "Draw",
  candidatesTitle: "Candidate EA matches",
  candidatesDescription:
    "EA matches between both teams' clubs near the kickoff. Choosing one sends nothing.",
  candidatesWindow: (from, to) => `Searched between ${from} and ${to}`,
  candidatesUpdated: (time) => `Updated at ${time}`,
  candidatesRefresh: "Refresh candidates",
  candidatesRefreshFailed: "We couldn't refresh. You're seeing the last candidates loaded.",
  candidatesEmptyTitle: "No EA matches yet",
  candidatesEmptyDescription:
    "There are no EA matches between both clubs near the kickoff. Refresh after playing.",
  notConnectedTitle: "An EA club isn't connected",
  notConnectedSide: (team) => `${team} has no EA club connected.`,
  notConnectedDescription: "Candidates appear once both teams connect their EA club.",
  providerMismatchTitle: "Clubs from different providers",
  providerMismatchDescription:
    "The two teams' clubs use different data providers, so their matches can't be compared.",
  candidatesForbiddenTitle: "Candidates restricted",
  candidatesForbiddenDescription:
    "Only the fixture's teams and the organization see candidate EA matches.",
  candidatesError: "We couldn't load the candidate EA matches.",
  candidateLabel: (home, away, time) => `${home} against ${away}, ${time}`,
  candidateDuration: (minutes) => `${minutes} min`,
  candidateDurationUnknown: "Unknown duration",
  candidateDisconnected: "Disconnection",
  candidateForfeit: "Win by forfeit",
  candidatePartial: "Partial data",
  candidateUnverified: "Unverified data",
  candidatePlayers: (count) => (count === 1 ? "1 player recorded" : `${count} players recorded`),
  candidateUseIn: (slot) => `Use in match ${slot}`,
  candidateUsedIn: (slot) => `In match ${slot}`,
  candidateUnused: "Unused",
  selectionTitle: "Official selection",
  selectionDescription:
    "Propose the EA matches that count, answer the opponent's proposal or open a dispute. Nothing is official until the opponent confirms.",
  actingAs: "Acting for",
  selectionLoading: "Loading the official selection",
  selectionError: "We couldn't load the official selection.",
  selectionForbidden: "You can't view or operate this fixture's official selection.",
  selectionRefresh: "Refresh selection",
  selectionRefreshFailed: "We couldn't refresh the selection. What you see may have changed.",
  selectionEmptyTitle: "No proposal yet",
  selectionEmptyDescription:
    "Assign an EA match to each official match and propose the selection to the opponent.",
  status: {
    none: "No proposal",
    awaiting_provider_data: "Waiting for provider data",
    candidates_available: "Candidates available",
    selection_in_progress: "Selection in progress",
    awaiting_opponent_confirmation: "Waiting for the opponent",
    confirmed: "Confirmed",
    disputed: "Disputed",
    organizer_review: "Under organization review",
    approved: "Approved",
    voided: "Voided",
  },
  version: (version) => `Version ${version}`,
  deadline: (date) => `The opponent can answer until ${date}`,
  approved: "Official result approved",
  notOfficial: "It isn't an official result yet and doesn't generate statistics.",
  noCommands: "There are no actions for your team in this state.",
  disputeTitle: "Dispute",
  disputeStatus: { open: "Open", under_review: "Under review", resolved: "Resolved" },
  disputeOpenedBy: (team) => `Opened by ${team}`,
  flagsTitle: "Integrity warnings",
  flag: {
    provider_data_incomplete: (match) => `Incomplete provider data in EA match ${match}`,
    provider_match_disconnected: (match) => `Disconnection in EA match ${match}`,
  },
  proposalsTitle: "Proposals",
  proposalLabel: (sequence, round) => `Proposal ${sequence} · round ${round}`,
  proposalCurrent: "Current",
  proposalBy: (team) => `From ${team}`,
  slotScore: (slot, home, homeGoals, awayGoals, away) =>
    `Match ${slot}: ${home} ${homeGoals}–${awayGoals} ${away}`,
  slotUnmatchedScore: (slot) => `Match ${slot}: played by other clubs`,
  slotMissing: (slot) => `Match ${slot}: no longer among the candidates`,
  slotMatch: (match) => `EA match ${match}`,
  slotPlayed: (match, time) => `EA match ${match} · played ${time}`,
  historyTitle: "Selection history",
  historyHide: "Hide history",
  historyByOperator: "Organization",
  historyBySystem: "System",
  history: {
    proposed: "Proposal sent",
    confirmed: "Proposal confirmed",
    approved: "Result approved",
    integrity_review_required: "Integrity review required",
    rejected: "Proposal rejected",
    alternative_proposed: "Alternative proposed",
    dispute_opened: "Dispute opened",
    review_started: "Review started",
    dispute_resolved_approved: "Dispute resolved with approval",
    returned_to_selection: "Returned to selection",
    voided: "Result voided",
    reference_reuse_rejected: "EA match already used in another fixture",
    legacy_review_required: "Review required by earlier data",
    confirmation_expired: "Confirmation window expired",
  },
  teamUnknown: "Unidentified team",
  command: {
    propose: {
      trigger: "Propose selection",
      title: "Propose the selection to the opponent",
      description: "The opponent receives these EA matches to confirm, reject or propose others.",
      submit: "Send proposal",
      success: "Proposal sent to the opponent.",
    },
    confirm: {
      trigger: "Confirm proposal",
      title: "Confirm the opponent's proposal",
      description: "Without integrity warnings, the selection is approved as the official result.",
      submit: "Confirm",
      success: "Proposal confirmed.",
    },
    reject: {
      trigger: "Reject",
      title: "Reject the proposal",
      description:
        "The selection becomes a dispute and the organization decides. Nothing becomes official.",
      submit: "Reject proposal",
      success: "Proposal rejected. The selection is now disputed.",
    },
    propose_alternative: {
      trigger: "Propose alternative",
      title: "Propose other EA matches",
      description:
        "Choosing the same matches as the current proposal counts as confirming. Choosing others makes it a dispute and the organization decides which count.",
      submit: "Send alternative",
      success:
        "Alternative sent. If it matches the current proposal it counts as confirming; otherwise the organization resolves the dispute.",
    },
    open_dispute: {
      trigger: "Open dispute",
      title: "Open a dispute",
      description: "The organization reviews the case. Meanwhile nothing becomes official.",
      submit: "Open dispute",
      success: "Dispute opened.",
    },
  },
  cancel: "Cancel",
  close: "Close",
  dialogSlots: "Matches you send",
  dialogSlotsIncomplete: "Assign an EA match to each official match before sending.",
  dialogTarget: "Proposal you're answering",
  reasonLabel: "Reason",
  reasonHelp: "Required. The opponent and the organization see it. 1000 characters max.",
  reasonRequired: "Write a reason to continue.",
  conflict: (from, to) =>
    `The selection changed: you read version ${from} and it's now on ${to}. Check the current state; your draft is kept and nothing was resent.`,
  unavailable: "This action is no longer available in the current state.",
  unknown:
    "We don't know whether it was saved because the connection failed. Trying again sends the same request and doesn't duplicate it.",
  invalidMessage: (code: string | null): string => {
    switch (code ?? "") {
      case "results.reason_required":
        return "Write a reason to continue.";
      case "results.invalid_selection":
        return "The selection isn't valid. Check the assigned EA matches.";
      case "results.duplicate_provider_match":
        return "You used the same EA match in two official matches.";
      case "results.integrity_flags_not_acknowledged":
        return "Confirm you reviewed the integrity warnings to approve.";
      default:
        return "It couldn't be sent. Check the details and try again.";
    }
  },
  reviewTitle: "Organization review",
  reviewDescription:
    "Review the dispute, take the case and decide. Only result approvers see it and it isn't published.",
  reviewLoading: "Loading the case file",
  reviewError: "We couldn't load the case file.",
  reviewForbidden: "You can't review disputes for this fixture.",
  reviewRefresh: "Refresh case file",
  reviewRefreshFailed: "We couldn't refresh the case file. What you see may have changed.",
  reviewEmpty: "There are no proposals in this fixture yet.",
  reviewNoCommands: "There are no pending decisions for the organization in this state.",
  reviewReasonHelp: "Required. It stays in the history and both teams see it. 1000 characters max.",
  review: {
    review_dispute: {
      trigger: "Take the case",
      title: "Take the case",
      description:
        "The dispute moves to organization review and the teams can no longer change it. Taking the case approves nothing.",
      submit: "Take the case",
      success: "You took the case. It's under organization review.",
    },
    approve_proposal: {
      trigger: "Approve a proposal",
      title: "Approve a proposal",
      description: "The proposal you choose becomes the official result and generates statistics.",
      submit: "Approve proposal",
      success: "Proposal approved. The result is now official.",
    },
    return_to_selection: {
      trigger: "Return to selection",
      title: "Return the case to selection",
      description: "This round's proposals close and the teams must agree on a new selection.",
      submit: "Return to selection",
      success: "Case returned to selection.",
    },
  },
  reviewChoose: "Proposal you approve",
  reviewChooseRequired: "Choose the proposal you're approving.",
  reviewFlags: "Integrity warnings on this proposal",
  reviewAcknowledge: "I reviewed the integrity warnings and approve anyway",
  reviewAcknowledgeRequired: "Confirm you reviewed the integrity warnings to approve.",
  disputesTitle: "Disputes",
  disputesDescription: "Selections waiting on an organization decision",
  disputesLoading: "Loading disputes",
  disputesError: "We couldn't load the disputes.",
  disputesEmptyTitle: "No pending disputes",
  disputesEmptyDescription:
    "They appear here when a team challenges the official selection or a case goes to organizer review.",
  disputesNotFoundTitle: "Competition unavailable",
  disputesNotFoundDescription:
    "It isn't in this organization or your account can't review its disputes.",
  disputesOpen: (home, away) => `Review the dispute of ${home} vs ${away}`,
  disputesKickoff: (when) => `Played on ${when}`,
  disputesStatus: { disputed: "Disputed", organizer_review: "Organizer review" },
  disputesTeamUnnamed: "Team name unavailable",
};
