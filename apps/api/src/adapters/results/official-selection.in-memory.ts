import { randomUUID } from "node:crypto";
import { externalReferenceKey, type ExternalReference } from "@futrob/game-data";
import type {
  CommitSelectionTransitionResult,
  ConfirmationAction,
  MatchDispute,
  OfficialMatchSelection,
  OfficialMatchSelectionRepository,
  OfficialSelectionProposal,
  SelectionTransition,
} from "@futrob/results";
import type { ActorId, EncounterId } from "@futrob/shared-kernel";
import {
  assertNextVersion,
  commandKeyIdentity,
  sortedUniqueReferences,
  transitionTime,
} from "./official-selection-transition.ts";

export interface InMemoryReferenceClaim {
  readonly id: string;
  readonly providerKey: string;
  readonly externalMatchId: string;
  readonly selectionId: string;
  readonly organizationId: string;
  readonly competitionId: string;
  readonly encounterId: string;
  readonly claimedByProposalId: string | null;
  readonly claimedAt: Date;
  releasedAt: Date | null;
  releaseReason: string | null;
}

export class InMemoryOfficialMatchSelectionRepository implements OfficialMatchSelectionRepository {
  selections: OfficialMatchSelection[] = [];
  proposals: OfficialSelectionProposal[] = [];
  actions: ConfirmationAction[] = [];
  disputes: MatchDispute[] = [];
  claims: InMemoryReferenceClaim[] = [];

  async findLatestByEncounter(encounterId: EncounterId): Promise<OfficialMatchSelection | null> {
    return this.selections.find((row) => row.encounterId === encounterId) ?? null;
  }

  async listProposals(selectionId: string): Promise<readonly OfficialSelectionProposal[]> {
    return this.proposals
      .filter((row) => row.selectionId === selectionId)
      .sort((left, right) => left.sequence - right.sequence);
  }

  async listActions(encounterId: EncounterId): Promise<readonly ConfirmationAction[]> {
    return this.actions.filter((row) => row.encounterId === encounterId);
  }

  async findActionsByCommandKey(input: {
    readonly encounterId: EncounterId;
    readonly actorId: ActorId;
    readonly commandKey: string;
  }): Promise<readonly ConfirmationAction[]> {
    return this.actions.filter(
      (row) =>
        row.encounterId === input.encounterId &&
        row.actorId === input.actorId &&
        row.commandKey === input.commandKey,
    );
  }

  async listDisputes(selectionId: string): Promise<readonly MatchDispute[]> {
    return this.disputes
      .filter((row) => row.selectionId === selectionId)
      .sort((left, right) => left.openedAt.getTime() - right.openedAt.getTime());
  }

  // Validate first, then apply, with no await in between: the whole call is atomic.
  async commitTransition(
    transition: SelectionTransition,
  ): Promise<CommitSelectionTransitionResult> {
    assertNextVersion(transition);
    const { selection, expectedVersion } = transition;

    const current =
      expectedVersion === 0
        ? (this.selections.find((row) => row.encounterId === selection.encounterId) ??
          this.selections.find((row) => row.id === selection.id))
        : this.selections.find((row) => row.id === selection.id);
    if (expectedVersion === 0 ? current : current?.version !== expectedVersion) {
      return { status: "version_conflict", currentVersion: current?.version ?? 0 };
    }

    const acquire = sortedUniqueReferences(transition.references.acquire);
    for (const ref of acquire) {
      const owner = this.liveClaim(ref);
      if (owner && owner.selectionId !== selection.id) {
        return { status: "reference_claimed", providerMatchRef: ref };
      }
    }

    this.assertTransitionInvariants(transition);

    const now = transitionTime(transition);
    this.selections = [...this.selections.filter((row) => row.id !== selection.id), selection];

    for (const ref of acquire) {
      if (this.liveClaim(ref)) continue;
      this.claims.push({
        id: randomUUID(),
        providerKey: ref.providerKey,
        externalMatchId: ref.externalId,
        selectionId: selection.id,
        organizationId: selection.organizationId,
        competitionId: selection.competitionId,
        encounterId: selection.encounterId,
        claimedByProposalId:
          selection.currentProposalId ?? transition.newProposals.at(-1)?.id ?? null,
        claimedAt: now,
        releasedAt: null,
        releaseReason: null,
      });
    }
    this.releaseClaims(transition, now);

    this.proposals.push(...transition.newProposals);
    this.actions.push(...transition.actions);

    if (transition.dispute?.kind === "open") {
      this.disputes.push(transition.dispute.dispute);
    } else if (transition.dispute?.kind === "update") {
      const updated = transition.dispute.dispute;
      this.disputes = this.disputes.map((row) => (row.id === updated.id ? updated : row));
    }
    return { status: "committed" };
  }

  async recordAudit(action: ConfirmationAction): Promise<void> {
    this.assertCommandKeysFree([action]);
    this.actions.push(action);
  }

  private liveClaim(ref: ExternalReference): InMemoryReferenceClaim | undefined {
    return this.claims.find(
      (claim) =>
        claim.releasedAt === null &&
        claim.providerKey === ref.providerKey &&
        claim.externalMatchId === ref.externalId,
    );
  }

  private releaseClaims(transition: SelectionTransition, releasedAt: Date): void {
    const { release } = transition.references;
    if (release === "none") return;
    const keep =
      release === "all" ? new Set<string>() : new Set(release.keep.map(externalReferenceKey));
    const reason = transition.actions.at(-1)?.type ?? null;
    for (const claim of this.claims) {
      if (claim.selectionId !== transition.selection.id || claim.releasedAt !== null) continue;
      if (keep.has(`${claim.providerKey}:${claim.externalMatchId}`)) continue;
      claim.releasedAt = releasedAt;
      claim.releaseReason = reason;
    }
  }

  private assertTransitionInvariants(transition: SelectionTransition): void {
    const proposalIds = new Set(this.proposals.map((row) => row.id));
    const sequences = new Set(this.proposals.map((row) => `${row.selectionId}:${row.sequence}`));
    for (const proposal of transition.newProposals) {
      const sequence = `${proposal.selectionId}:${proposal.sequence}`;
      if (proposalIds.has(proposal.id) || sequences.has(sequence)) {
        throw new Error(`Duplicate selection proposal ${proposal.id}`);
      }
      proposalIds.add(proposal.id);
      sequences.add(sequence);
    }
    this.assertCommandKeysFree(transition.actions);

    const { dispute } = transition;
    if (dispute?.kind === "open") {
      const active = this.disputes.some(
        (row) => row.selectionId === dispute.dispute.selectionId && row.status !== "resolved",
      );
      if (active || this.disputes.some((row) => row.id === dispute.dispute.id)) {
        throw new Error(`Selection ${dispute.dispute.selectionId} already has an active dispute`);
      }
    } else if (dispute?.kind === "update") {
      if (!this.disputes.some((row) => row.id === dispute.dispute.id)) {
        throw new Error(`Unknown dispute ${dispute.dispute.id}`);
      }
    }
  }

  private assertCommandKeysFree(actions: readonly ConfirmationAction[]): void {
    const seen = new Set(
      this.actions.map(commandKeyIdentity).filter((identity) => identity !== null),
    );
    for (const action of actions) {
      const identity = commandKeyIdentity(action);
      if (identity === null) continue;
      if (seen.has(identity)) {
        throw new Error(`Command key ${action.commandKey} already recorded for ${action.type}`);
      }
      seen.add(identity);
    }
  }
}
