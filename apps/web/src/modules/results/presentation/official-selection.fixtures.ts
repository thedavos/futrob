import type {
  OfficialSelectionActionDto,
  OfficialSelectionCommandResponse,
  OfficialSelectionProposalDto,
  OfficialSelectionViewDto,
} from "@futrob/api-contracts";

const ref = (externalId: string) => ({ providerKey: "ea-clubs" as const, externalId });
const slots = (first: string, second: string) => [
  { officialSlot: 1 as const, providerMatchRef: ref(first) },
  { officialSlot: 2 as const, providerMatchRef: ref(second) },
];

type Status = NonNullable<OfficialSelectionViewDto["selection"]>["status"];

const selection = (status: Status, version: number, currentProposalId: string | null) => ({
  id: "selection-1",
  encounterId: "encounter-1",
  organizationId: "org-1",
  competitionId: "competition-1",
  status,
  version,
  round: 1,
  currentProposalId,
  createdAt: "2026-09-17T03:00:00.000Z",
  updatedAt: "2026-09-17T03:10:00.000Z",
});

/** Cuervos (home) proposes m-1 for match 1 and m-2 for match 2. */
export const homeProposal: OfficialSelectionProposalDto = {
  id: "proposal-1",
  round: 1,
  sequence: 1,
  proposingTeamId: "team-home",
  proposedByActorId: "actor-home-captain",
  slots: slots("m-1", "m-2"),
  supersedesProposalId: null,
  reason: null,
  createdAt: "2026-09-17T03:00:00.000Z",
  confirmationDeadline: "2026-09-18T03:00:00.000Z",
};

/** Maderas (away) answers with m-1 and m-3 instead. */
export const awayAlternative: OfficialSelectionProposalDto = {
  id: "proposal-2",
  round: 1,
  sequence: 2,
  proposingTeamId: "team-away",
  proposedByActorId: "actor-away-captain",
  slots: slots("m-1", "m-3"),
  supersedesProposalId: "proposal-1",
  reason: "El partido 2 fue el de las 20:50, no el de las 20:40.",
  createdAt: "2026-09-17T04:00:00.000Z",
  confirmationDeadline: "2026-09-18T04:00:00.000Z",
};

/** Maderas answers with m-5 for match 2: same clubs and score as Cuervos' m-2. */
export const awayRematch: OfficialSelectionProposalDto = {
  ...awayAlternative,
  slots: slots("m-1", "m-5"),
};

const action = (
  id: string,
  type: OfficialSelectionActionDto["type"],
  versionAfter: number,
  teamId: string | null,
  reason: string | null = null,
): OfficialSelectionActionDto => ({
  id,
  proposalId: "proposal-1",
  type,
  fromStatus: null,
  toStatus: null,
  versionBefore: versionAfter - 1,
  versionAfter,
  actorId: teamId === "team-away" ? "actor-away-captain" : "actor-home-captain",
  teamId,
  capacity: "team",
  reason,
  officialResultId: null,
  details: null,
  occurredAt: `2026-09-17T0${2 + versionAfter}:00:00.000Z`,
});

export function noSelection(
  allowedActions: OfficialSelectionViewDto["allowedActions"] = ["propose"],
): OfficialSelectionViewDto {
  return {
    encounterId: "encounter-1",
    selection: null,
    proposals: [],
    actions: [],
    disputes: [],
    activeDispute: null,
    approvedResultId: null,
    integrityFlags: [],
    allowedActions,
  };
}

/** Home's proposal waits for the opponent; `allowedActions` is what the server serves. */
export function pendingSelection(
  allowedActions: OfficialSelectionViewDto["allowedActions"],
  version = 1,
): OfficialSelectionViewDto {
  return {
    ...noSelection(allowedActions),
    selection: selection("awaiting_opponent_confirmation", version, "proposal-1"),
    proposals: [homeProposal],
    actions: [action("action-1", "proposed", 1, "team-home")],
  };
}

export function approvedSelection(): OfficialSelectionViewDto {
  return {
    ...noSelection([]),
    selection: selection("approved", 2, "proposal-1"),
    proposals: [homeProposal],
    actions: [
      action("action-1", "proposed", 1, "team-home"),
      action("action-2", "confirmed", 2, "team-away"),
    ],
    approvedResultId: "result-1",
  };
}

export const rejectionReason = "El partido 2 fue un amistoso, no el oficial.";

export function disputedSelection(): OfficialSelectionViewDto {
  const dispute = {
    id: "dispute-1",
    status: "open" as const,
    openedByActorId: "actor-away-captain",
    openedByTeamId: "team-away",
    openedReason: rejectionReason,
    openedAt: "2026-09-17T04:00:00.000Z",
    reviewStartedAt: null,
    resolvedAt: null,
    resolution: null,
    resolutionProposalId: null,
    resolutionReason: null,
  };
  return {
    ...noSelection([]),
    selection: selection("disputed", 2, "proposal-1"),
    proposals: [homeProposal],
    actions: [
      action("action-1", "proposed", 1, "team-home"),
      action("action-2", "rejected", 2, "team-away", rejectionReason),
    ],
    disputes: [dispute],
    activeDispute: dispute,
  };
}

export function alternativeSelection(
  allowedActions: OfficialSelectionViewDto["allowedActions"] = ["open_dispute"],
): OfficialSelectionViewDto {
  return {
    ...noSelection(allowedActions),
    selection: selection("awaiting_opponent_confirmation", 2, "proposal-2"),
    proposals: [homeProposal, awayAlternative],
    actions: [
      action("action-1", "proposed", 1, "team-home"),
      action("action-2", "alternative_proposed", 2, "team-away", awayAlternative.reason),
    ],
  };
}

export function underReviewWithFlags(): OfficialSelectionViewDto {
  return {
    ...disputedSelection(),
    selection: selection("organizer_review", 3, "proposal-1"),
    integrityFlags: [{ code: "provider_match_disconnected", providerMatchRef: ref("m-2") }],
  };
}

/*
 * Operator case: Cuervos proposed X/Y (m-1/m-2), Maderas answered X/Z (m-1/m-3) and
 * Cuervos rejected X/Z, which opened the dispute. Reasons arrive already redacted.
 */

/** As served: the server replaced a phone and an email; the markup is literal text. */
export const disputeReason =
  "El partido 2 de su alternativa fue un amistoso. Hablamos al [REDACTED] y a [REDACTED]. <b>Urgente</b>";
export const reviewReason = "Reviso las capturas de ambos equipos.";
export const approvalReason = "Las capturas confirman que el 2 se jugó a las 20:50.";
export const returnReason = "Ninguna propuesta coincide con el horario oficial.";

const operatorAction = (
  id: string,
  type: OfficialSelectionActionDto["type"],
  versionAfter: number,
  proposalId: string | null,
  reason: string,
  details: OfficialSelectionActionDto["details"] = null,
): OfficialSelectionActionDto => ({
  id,
  proposalId,
  type,
  fromStatus: null,
  toStatus: null,
  versionBefore: versionAfter - 1,
  versionAfter,
  actorId: "actor-operator",
  teamId: null,
  capacity: "operator",
  reason,
  officialResultId: null,
  details,
  occurredAt: `2026-09-17T0${2 + versionAfter}:30:00.000Z`,
});

const openDispute = {
  id: "dispute-1",
  status: "open" as const,
  openedByActorId: "actor-home-captain",
  openedByTeamId: "team-home",
  openedReason: disputeReason,
  openedAt: "2026-09-17T05:00:00.000Z",
  reviewStartedAt: null,
  resolvedAt: null,
  resolution: null,
  resolutionProposalId: null,
  resolutionReason: null,
};

const contestedActions = [
  action("action-1", "proposed", 1, "team-home"),
  {
    ...action("action-2", "alternative_proposed", 2, "team-away", awayAlternative.reason),
    proposalId: "proposal-2",
  },
  { ...action("action-3", "rejected", 3, "team-home", disputeReason), proposalId: "proposal-2" },
];

export function disputeCase(
  allowedActions: OfficialSelectionViewDto["allowedActions"] = ["review_dispute"],
  version = 3,
): OfficialSelectionViewDto {
  return {
    ...noSelection(allowedActions),
    selection: selection("disputed", version, "proposal-2"),
    proposals: [homeProposal, awayAlternative],
    actions: contestedActions,
    disputes: [openDispute],
    activeDispute: openDispute,
  };
}

export function reviewCase({
  allowedActions = ["resolve_dispute"],
  integrityFlags = [],
  version = 4,
}: Partial<Pick<OfficialSelectionViewDto, "allowedActions" | "integrityFlags">> & {
  readonly version?: number;
} = {}): OfficialSelectionViewDto {
  const dispute = {
    ...openDispute,
    status: "under_review" as const,
    reviewStartedAt: "2026-09-17T06:30:00.000Z",
  };
  return {
    ...disputeCase(allowedActions),
    selection: selection("organizer_review", version, "proposal-2"),
    actions: [
      ...contestedActions,
      operatorAction("action-4", "review_started", 4, "proposal-2", reviewReason, {
        disputeId: "dispute-1",
      }),
    ],
    disputes: [dispute],
    activeDispute: dispute,
    integrityFlags,
  };
}

/** m-3 dropped a player: approving X/Z needs the acknowledgement, X/Y does not. */
export const m3Disconnected = [
  { code: "provider_match_disconnected" as const, providerMatchRef: ref("m-3") },
];

/** The operator approved `proposal`, X/Z by default, and the case is official. */
export function resolvedByApproval(
  proposal: OfficialSelectionProposalDto = awayAlternative,
): OfficialSelectionViewDto {
  const review = reviewCase();
  const dispute = {
    ...openDispute,
    status: "resolved" as const,
    reviewStartedAt: "2026-09-17T06:30:00.000Z",
    resolvedAt: "2026-09-17T07:30:00.000Z",
    resolution: "approved_proposal" as const,
    resolutionProposalId: proposal.id,
    resolutionReason: approvalReason,
  };
  return {
    ...review,
    selection: selection("approved", 5, proposal.id),
    actions: [
      ...review.actions,
      {
        ...operatorAction("action-5", "dispute_resolved_approved", 5, proposal.id, approvalReason, {
          selectedProposalId: proposal.id,
          disputeId: "dispute-1",
        }),
        officialResultId: "result-1",
      },
    ],
    disputes: [dispute],
    activeDispute: null,
    approvedResultId: "result-1",
    integrityFlags: [],
    allowedActions: ["void"],
  };
}

export function returnedToSelection(): OfficialSelectionViewDto {
  const review = reviewCase();
  const dispute = {
    ...openDispute,
    status: "resolved" as const,
    reviewStartedAt: "2026-09-17T06:30:00.000Z",
    resolvedAt: "2026-09-17T07:30:00.000Z",
    resolution: "returned_to_selection" as const,
    resolutionReason: returnReason,
  };
  return {
    ...review,
    selection: { ...selection("selection_in_progress", 5, null), round: 2 },
    actions: [
      ...review.actions,
      operatorAction("action-5", "returned_to_selection", 5, "proposal-2", returnReason, {
        disputeId: "dispute-1",
      }),
    ],
    disputes: [dispute],
    activeDispute: null,
    integrityFlags: [],
    allowedActions: [],
  };
}

export function commandResponse(view: OfficialSelectionViewDto): OfficialSelectionCommandResponse {
  if (!view.selection) throw new Error("A command always leaves a selection behind");
  return {
    selection: view.selection,
    proposal: view.proposals.find((row) => row.id === view.selection?.currentProposalId) ?? null,
    actions: view.actions.slice(-1),
    dispute: view.activeDispute,
    approvedResult: view.approvedResultId
      ? {
          id: view.approvedResultId,
          revision: 1,
          status: "approved",
          approvalBasis: "team_agreement",
          proposalId: view.selection.currentProposalId,
          approvedAt: "2026-09-17T04:00:00.000Z",
        }
      : null,
    integrityFlags: view.integrityFlags,
    replayed: false,
  };
}
