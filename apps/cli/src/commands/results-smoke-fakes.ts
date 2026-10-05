import { externalReferenceKey } from "@futrob/game-data";
import type {
  ConfirmationAction,
  MatchDispute,
  OfficialMatchSelection,
  OfficialMatchSelectionRepository,
  OfficialResult,
  OfficialResultRepository,
  OfficialSelectionProposal,
  SelectionTransition,
  SelectionCommandDigestPort,
  TeamRepresentationPort,
} from "@futrob/results";
import type { ActorId, EncounterId, TeamId } from "@futrob/shared-kernel";

/** Offline fake only; cryptographic persistence is verified in the API's Postgres tests. */
export class SmokeCommandDigest implements SelectionCommandDigestPort {
  private readonly receipts = new Map<string, string>();

  sha256(canonical: string): string {
    let receipt = this.receipts.get(canonical);
    if (!receipt) {
      receipt = (this.receipts.size + 1).toString(16).padStart(64, "0");
      this.receipts.set(canonical, receipt);
    }
    return receipt;
  }
}

/** Offline stand-in for the Postgres selection repository: same CAS and claim semantics. */
export class SmokeSelections implements OfficialMatchSelectionRepository {
  private readonly selections = new Map<EncounterId, OfficialMatchSelection>();
  private readonly proposals: OfficialSelectionProposal[] = [];
  private readonly actions: ConfirmationAction[] = [];
  private readonly disputes: MatchDispute[] = [];
  private readonly claims = new Map<string, string>();

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
    encounterId: EncounterId;
    actorId: ActorId;
    commandKey: string;
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

  async commitTransition(t: SelectionTransition) {
    const currentVersion = this.selections.get(t.selection.encounterId)?.version ?? 0;
    if (currentVersion !== t.expectedVersion) {
      return { status: "version_conflict" as const, currentVersion };
    }
    for (const ref of t.references.acquire) {
      const owner = this.claims.get(externalReferenceKey(ref));
      if (owner !== undefined && owner !== t.selection.id) {
        return { status: "reference_claimed" as const, providerMatchRef: ref };
      }
    }
    this.selections.set(t.selection.encounterId, t.selection);
    for (const ref of t.references.acquire) {
      this.claims.set(externalReferenceKey(ref), t.selection.id);
    }
    if (t.references.release !== "none") {
      const keep =
        t.references.release === "all"
          ? new Set<string>()
          : new Set(t.references.release.keep.map(externalReferenceKey));
      for (const [key, owner] of this.claims) {
        if (owner === t.selection.id && !keep.has(key)) this.claims.delete(key);
      }
    }
    this.proposals.push(...t.newProposals);
    this.actions.push(...t.actions);
    if (t.dispute?.kind === "open") this.disputes.push(t.dispute.dispute);
    if (t.dispute?.kind === "update") {
      const index = this.disputes.findIndex((row) => row.id === t.dispute?.dispute.id);
      if (index >= 0) this.disputes[index] = t.dispute.dispute;
    }
    return { status: "committed" as const };
  }

  async recordAudit(action: ConfirmationAction) {
    this.actions.push(action);
  }
}

export class SmokeResults implements OfficialResultRepository {
  private readonly rows: OfficialResult[] = [];

  async append(result: OfficialResult) {
    this.rows.push(result);
    return result;
  }
  async markVoided(officialResultId: string) {
    const index = this.rows.findIndex((row) => row.id === officialResultId);
    const row = this.rows[index];
    if (!row) return null;
    const updated: OfficialResult = { ...row, status: "voided" };
    this.rows[index] = updated;
    return updated;
  }
  async findApprovedByEncounter(encounterId: EncounterId) {
    return (
      this.rows.find((row) => row.encounterId === encounterId && row.status === "approved") ?? null
    );
  }
  async findLatestByEncounter(encounterId: EncounterId) {
    return [...this.rows].reverse().find((row) => row.encounterId === encounterId) ?? null;
  }
  async findById(id: string) {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async listByCompetition() {
    return [...this.rows];
  }
  async listByEncounter(encounterId: EncounterId) {
    return this.rows.filter((row) => row.encounterId === encounterId);
  }
}

export function smokeTeamRepresentation(
  captains: ReadonlyArray<readonly [ActorId, TeamId]>,
): TeamRepresentationPort {
  return {
    findRepresentation: async ({ actorId, teamId }) =>
      captains.some(([actor, team]) => actor === actorId && team === teamId)
        ? { teamId, role: "captain" as const }
        : null,
  };
}
