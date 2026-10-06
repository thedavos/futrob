import { externalReferenceKey } from "@futrob/game-data";
import { compareTime, Panic, type ActorId, type EncounterId } from "@futrob/shared-kernel";
import type { ConfirmationAction } from "../domain/entities/confirmation-action.ts";
import type { MatchDispute } from "../domain/entities/match-dispute.ts";
import type {
  OfficialMatchSelection,
  OfficialSelectionProposal,
} from "../domain/entities/official-match-selection.ts";
import type { OfficialResult } from "../domain/entities/official-result.ts";
import type {
  CommitSelectionTransitionResult,
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
  SelectionTransition,
} from "../domain/ports/official-result.repository.ts";

/** Reference ownership shared by every selection repository created for one "database". */
export class MemoryReferenceClaims {
  readonly rows: Array<{
    key: string;
    selectionId: string;
    releasedAt: Date | null;
    releaseReason: string | null;
  }> = [];

  liveOwner(key: string): string | null {
    return this.rows.find((row) => row.key === key && row.releasedAt === null)?.selectionId ?? null;
  }
}

export class MemoryOfficialSelections implements OfficialMatchSelectionRepository {
  readonly selections = new Map<EncounterId, OfficialMatchSelection>();
  readonly proposals: OfficialSelectionProposal[] = [];
  readonly actions: ConfirmationAction[] = [];
  readonly disputes: MatchDispute[] = [];
  commits = 0;
  /** Makes the next commit throw after validation, like a failing database write. */
  failNextCommit: Error | null = null;

  constructor(readonly claims = new MemoryReferenceClaims()) {}

  async listDueConfirmations(input: { readonly dueAt: Date; readonly limit: number }) {
    return [...this.selections.values()]
      .filter((selection) => {
        const proposal = this.proposals.find((row) => row.id === selection.currentProposalId);
        return (
          selection.status === "awaiting_opponent_confirmation" &&
          proposal &&
          compareTime(proposal.confirmationDeadline, input.dueAt) <= 0
        );
      })
      .sort((left, right) => left.encounterId.localeCompare(right.encounterId))
      .slice(0, input.limit);
  }

  async findLatestByEncounter(encounterId: EncounterId) {
    return this.selections.get(encounterId) ?? null;
  }

  async listProposals(selectionId: string) {
    return this.proposals.filter((row) => row.selectionId === selectionId);
  }

  async listActions(encounterId: EncounterId) {
    return this.actions.filter((row) => row.encounterId === encounterId);
  }

  async findActionsByCommandKey(input: {
    readonly encounterId: EncounterId;
    readonly actorId: ActorId;
    readonly commandKey: string;
  }) {
    return this.actions.filter(
      (row) =>
        row.encounterId === input.encounterId &&
        row.actorId === input.actorId &&
        row.commandKey === input.commandKey,
    );
  }

  async listDisputes(selectionId: string) {
    return this.disputes.filter((row) => row.selectionId === selectionId);
  }

  async commitTransition(t: SelectionTransition): Promise<CommitSelectionTransitionResult> {
    const current = this.selections.get(t.selection.encounterId);
    const currentVersion = current?.version ?? 0;
    if (currentVersion !== t.expectedVersion) {
      return { status: "version_conflict", currentVersion };
    }
    if (t.selection.version !== t.expectedVersion + 1) {
      throw new Panic("Transition must advance the version by one");
    }
    for (const ref of t.references.acquire) {
      const owner = this.claims.liveOwner(externalReferenceKey(ref));
      if (owner !== null && owner !== t.selection.id) {
        return { status: "reference_claimed", providerMatchRef: ref };
      }
    }
    if (this.failNextCommit) {
      const error = this.failNextCommit;
      this.failNextCommit = null;
      throw error;
    }

    const at = t.actions[0]?.occurredAt ?? t.selection.updatedAt;
    this.selections.set(t.selection.encounterId, t.selection);
    for (const ref of t.references.acquire) {
      const key = externalReferenceKey(ref);
      if (this.claims.liveOwner(key) === null) {
        this.claims.rows.push({
          key,
          selectionId: t.selection.id,
          releasedAt: null,
          releaseReason: null,
        });
      }
    }
    const keep =
      t.references.release === "none" || t.references.release === "all"
        ? null
        : new Set(t.references.release.keep.map(externalReferenceKey));
    if (t.references.release !== "none") {
      for (const row of this.claims.rows) {
        if (row.selectionId !== t.selection.id || row.releasedAt !== null) continue;
        if (keep === null || !keep.has(row.key)) {
          row.releasedAt = at;
          row.releaseReason = t.actions[0]?.type ?? "released";
        }
      }
    }
    this.proposals.push(...t.newProposals);
    this.actions.push(...t.actions);
    if (t.dispute?.kind === "open") this.disputes.push(t.dispute.dispute);
    if (t.dispute?.kind === "update") {
      const index = this.disputes.findIndex((row) => row.id === t.dispute?.dispute.id);
      if (index >= 0) this.disputes[index] = t.dispute.dispute;
    }
    this.commits += 1;
    return { status: "committed" };
  }

  async recordAudit(action: ConfirmationAction) {
    this.actions.push(action);
  }

  liveClaimKeys(selectionId: string): string[] {
    return this.claims.rows
      .filter((row) => row.selectionId === selectionId && row.releasedAt === null)
      .map((row) => row.key)
      .sort();
  }
}

export class MemoryOfficialResults implements OfficialResultRepository {
  readonly rows: OfficialResult[] = [];

  async append(result: OfficialResult) {
    if (
      this.rows.some(
        (row) => row.encounterId === result.encounterId && row.revision === result.revision,
      )
    ) {
      throw new Panic("revision conflict");
    }
    this.rows.push(result);
    return result;
  }

  async markVoided(officialResultId: string) {
    const index = this.rows.findIndex((row) => row.id === officialResultId);
    const row = this.rows[index];
    if (!row) return null;
    const updated: OfficialResult = row.status === "approved" ? { ...row, status: "voided" } : row;
    this.rows[index] = updated;
    return updated;
  }

  async findApprovedByEncounter(encounterId: EncounterId) {
    return (
      [...this.rows]
        .filter((row) => row.encounterId === encounterId && row.status === "approved")
        .sort((a, b) => b.revision - a.revision)[0] ?? null
    );
  }

  async findLatestByEncounter(encounterId: EncounterId) {
    return (
      [...this.rows]
        .filter((row) => row.encounterId === encounterId)
        .sort((a, b) => b.revision - a.revision)[0] ?? null
    );
  }

  async findById(id: string) {
    return this.rows.find((row) => row.id === id) ?? null;
  }

  async listByCompetition(competitionId: OfficialResult["competitionId"]) {
    return this.rows.filter((row) => row.competitionId === competitionId);
  }

  async listByEncounter(encounterId: EncounterId) {
    return this.rows.filter((row) => row.encounterId === encounterId);
  }
}
