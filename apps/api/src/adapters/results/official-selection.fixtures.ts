import { randomUUID } from "node:crypto";
import type { ExternalReference } from "@futrob/game-data";
import type {
  ConfirmationAction,
  MatchDispute,
  OfficialMatchSelection,
  OfficialMatchSelectionRepository,
  OfficialResult,
  OfficialResultRepository,
  OfficialSelectionProposal,
  SelectionTransition,
} from "@futrob/results";
import {
  asActorId,
  asEncounterId,
  asTeamId,
  type ActorId,
  type CompetitionId,
  type EncounterId,
  type OrganizationId,
  type TransactionPort,
} from "@futrob/shared-kernel";

export interface ContractTenant {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
}

export interface ContractClaim {
  readonly providerKey: string;
  readonly externalMatchId: string;
  readonly selectionId: string;
  readonly releasedAt: Date | null;
}

export interface SelectionContractHarness {
  readonly selections: OfficialMatchSelectionRepository;
  readonly results: OfficialResultRepository;
  readonly transaction: TransactionPort;
  /** Two distinct organizations, each with a competition. */
  readonly tenants: readonly [ContractTenant, ContractTenant];
  /** Registers actors where the adapter enforces the actor foreign key. */
  seedActors(...actorIds: readonly string[]): Promise<void>;
  counts(encounterId: EncounterId): Promise<{
    readonly selections: number;
    readonly proposals: number;
    readonly actions: number;
    readonly disputes: number;
  }>;
  claims(refs: readonly ExternalReference[]): Promise<readonly ContractClaim[]>;
}

const T0 = new Date("2026-09-14T20:00:00.000Z");
export const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

export function newRef(): ExternalReference {
  return { providerKey: "ea-clubs", externalId: `match-${randomUUID()}` };
}

export function newEncounterId(): EncounterId {
  return asEncounterId(`enc-${randomUUID()}`);
}

export function newActorId(): ActorId {
  return asActorId(`actor-${randomUUID()}`);
}

export function buildSelection(
  tenant: ContractTenant,
  encounterId: EncounterId,
  overrides: Partial<OfficialMatchSelection> = {},
): OfficialMatchSelection {
  return {
    id: `selection-${randomUUID()}`,
    encounterId,
    organizationId: tenant.organizationId,
    competitionId: tenant.competitionId,
    status: "awaiting_opponent_confirmation",
    version: 1,
    round: 1,
    currentProposalId: null,
    createdAt: at(0),
    updatedAt: at(0),
    ...overrides,
  };
}

export function buildProposal(
  selection: OfficialMatchSelection,
  refs: readonly ExternalReference[],
  overrides: Partial<OfficialSelectionProposal> = {},
): OfficialSelectionProposal {
  return {
    id: `proposal-${randomUUID()}`,
    selectionId: selection.id,
    organizationId: selection.organizationId,
    competitionId: selection.competitionId,
    encounterId: selection.encounterId,
    round: selection.round,
    sequence: 1,
    proposingTeamId: asTeamId("team-home"),
    proposedByActorId: newActorId(),
    slots: refs.map((providerMatchRef, index) => ({
      officialSlot: index === 0 ? (1 as const) : (2 as const),
      providerMatchRef,
    })),
    supersedesProposalId: null,
    reason: null,
    createdAt: at(0),
    ...overrides,
  };
}

export function buildAction(
  selection: OfficialMatchSelection | null,
  scope: ContractTenant & { readonly encounterId: EncounterId },
  actorId: ActorId,
  overrides: Partial<ConfirmationAction> = {},
): ConfirmationAction {
  return {
    id: `action-${randomUUID()}`,
    selectionId: selection?.id ?? null,
    proposalId: selection?.currentProposalId ?? null,
    organizationId: scope.organizationId,
    competitionId: scope.competitionId,
    encounterId: scope.encounterId,
    type: "proposed",
    fromStatus: null,
    toStatus: selection?.status ?? null,
    versionBefore: 0,
    versionAfter: selection?.version ?? 0,
    actorId,
    teamId: asTeamId("team-home"),
    capacity: "team",
    reason: null,
    commandKey: null,
    requestFingerprint: null,
    officialResultId: null,
    details: null,
    occurredAt: at(0),
    ...overrides,
  };
}

export function buildDispute(
  selection: OfficialMatchSelection,
  actorId: ActorId,
  overrides: Partial<MatchDispute> = {},
): MatchDispute {
  return {
    id: `dispute-${randomUUID()}`,
    selectionId: selection.id,
    organizationId: selection.organizationId,
    competitionId: selection.competitionId,
    encounterId: selection.encounterId,
    status: "open",
    openedByActorId: actorId,
    openedByTeamId: asTeamId("team-away"),
    openedReason: "Wrong scoreline",
    openedAt: at(5),
    reviewStartedByActorId: null,
    reviewStartedAt: null,
    resolvedByActorId: null,
    resolvedAt: null,
    resolution: null,
    resolutionProposalId: null,
    resolutionReason: null,
    ...overrides,
  };
}

export function buildResult(
  tenant: ContractTenant,
  encounterId: EncounterId,
  actorId: ActorId,
  overrides: Partial<OfficialResult> = {},
): OfficialResult {
  return {
    id: `result-${randomUUID()}`,
    encounterId,
    organizationId: tenant.organizationId,
    competitionId: tenant.competitionId,
    revision: 1,
    status: "approved",
    slots: [
      {
        officialSlot: 1,
        providerMatchRef: newRef(),
        homeExternalClubId: "club-home",
        awayExternalClubId: "club-away",
        homeGoals: 2,
        awayGoals: 1,
        occurredAt: at(-90),
        gameEdition: "fc27",
        platform: "playstation",
        players: [
          {
            externalPlayerId: "player-1",
            displayName: "Player One",
            externalClubId: "club-home",
            position: "ST",
            minutesPlayed: 90,
            goals: 2,
            assists: 0,
            shots: 4,
            passAttempts: 20,
            passesMade: 15,
            tackleAttempts: 1,
            tacklesMade: 1,
            saves: null,
            yellowCards: 0,
            redCards: 0,
            isMvp: true,
            rating: 8.5,
          },
        ],
      },
    ],
    approvedAt: at(0),
    approvedBy: actorId,
    selectionId: null,
    proposalId: null,
    approvalBasis: null,
    ...overrides,
  };
}

/** A transition that creates `selection` (version 1) with one proposal and one action. */
export function createTransition(
  tenant: ContractTenant,
  encounterId: EncounterId,
  actorId: ActorId,
  refs: readonly ExternalReference[],
  overrides: Partial<SelectionTransition> = {},
): SelectionTransition & {
  readonly proposal: OfficialSelectionProposal;
  readonly action: ConfirmationAction;
} {
  const base = buildSelection(tenant, encounterId);
  const proposal = buildProposal(base, refs, { proposedByActorId: actorId });
  const selection = { ...base, currentProposalId: proposal.id };
  const action = buildAction(selection, { ...tenant, encounterId }, actorId, {
    proposalId: proposal.id,
  });
  return {
    expectedVersion: 0,
    selection,
    newProposals: [proposal],
    actions: [action],
    dispute: null,
    references: { acquire: refs, release: "none" },
    proposal,
    action,
    ...overrides,
  };
}

/** Next state of an existing selection (version + 1). */
export function advance(
  selection: OfficialMatchSelection,
  overrides: Partial<OfficialMatchSelection> = {},
): OfficialMatchSelection {
  return { ...selection, version: selection.version + 1, updatedAt: at(10), ...overrides };
}
