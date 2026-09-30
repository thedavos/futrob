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
import { type ActorId, type EncounterId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor, runInPgAtomicScope } from "@/adapters/persistence/pg-transaction.ts";
import {
  ACTION_COLUMNS,
  actionRowSchema,
  disputeRowSchema,
  insertAction,
  insertDispute,
  insertProposal,
  proposalRowSchema,
  rehydrateAction,
  rehydrateDispute,
  rehydrateProposal,
  rehydrateSelection,
  selectionRowSchema,
  updateDispute,
  type PgQuery,
} from "./official-selection-rows.ts";
import {
  assertNextVersion,
  sortedUniqueReferences,
  transitionTime,
} from "./official-selection-transition.ts";

export class PostgresOfficialMatchSelectionRepository implements OfficialMatchSelectionRepository {
  constructor(private readonly pool: Pool) {}

  async findLatestByEncounter(encounterId: EncounterId): Promise<OfficialMatchSelection | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, encounter_id, organization_id, competition_id, status, version, round,
              current_proposal_id, created_at, updated_at
       FROM official_match_selections
       WHERE encounter_id = $1 AND superseded_at IS NULL`,
      [encounterId],
    );
    const row = result.rows[0];
    return row ? rehydrateSelection(selectionRowSchema.parse(row)) : null;
  }

  async listProposals(selectionId: string): Promise<readonly OfficialSelectionProposal[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, selection_id, organization_id, competition_id, encounter_id, round, sequence,
              proposing_team_id, proposed_by_actor_id, slots, supersedes_proposal_id, reason,
              created_at
       FROM official_selection_proposals
       WHERE selection_id = $1
       ORDER BY sequence`,
      [selectionId],
    );
    return result.rows.map((row) => rehydrateProposal(proposalRowSchema.parse(row)));
  }

  async listActions(encounterId: EncounterId): Promise<readonly ConfirmationAction[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${ACTION_COLUMNS}
       FROM official_selection_actions
       WHERE encounter_id = $1
       ORDER BY seq`,
      [encounterId],
    );
    return result.rows.map((row) => rehydrateAction(actionRowSchema.parse(row)));
  }

  async findActionsByCommandKey(input: {
    readonly encounterId: EncounterId;
    readonly actorId: ActorId;
    readonly commandKey: string;
  }): Promise<readonly ConfirmationAction[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${ACTION_COLUMNS}
       FROM official_selection_actions
       WHERE encounter_id = $1 AND actor_id = $2 AND command_key = $3
       ORDER BY seq`,
      [input.encounterId, input.actorId, input.commandKey],
    );
    return result.rows.map((row) => rehydrateAction(actionRowSchema.parse(row)));
  }

  async listDisputes(selectionId: string): Promise<readonly MatchDispute[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, selection_id, organization_id, competition_id, encounter_id, status,
              opened_by_actor_id, opened_by_team_id, opened_reason, opened_at,
              review_started_by_actor_id, review_started_at, resolved_by_actor_id, resolved_at,
              resolution, resolution_proposal_id, resolution_reason
       FROM match_disputes
       WHERE selection_id = $1
       ORDER BY opened_at, id`,
      [selectionId],
    );
    return result.rows.map((row) => rehydrateDispute(disputeRowSchema.parse(row)));
  }

  async commitTransition(
    transition: SelectionTransition,
  ): Promise<CommitSelectionTransitionResult> {
    assertNextVersion(transition);
    return runInPgAtomicScope(this.pool, () => this.applyTransition(transition), {
      rollbackWhen: (result) => result.status !== "committed",
    });
  }

  async recordAudit(action: ConfirmationAction): Promise<void> {
    await insertAction(getPgExecutor(this.pool), action);
  }

  private async applyTransition(
    transition: SelectionTransition,
  ): Promise<CommitSelectionTransitionResult> {
    const db = getPgExecutor(this.pool);

    const conflict = await this.writeSelection(db, transition);
    if (conflict) return conflict;

    const claimed = await this.applyReferenceClaims(db, transition);
    if (claimed) return claimed;

    for (const proposal of transition.newProposals) await insertProposal(db, proposal);
    for (const action of transition.actions) await insertAction(db, action);
    if (transition.dispute?.kind === "open") {
      await insertDispute(db, transition.dispute.dispute);
    } else if (transition.dispute?.kind === "update") {
      await updateDispute(db, transition.dispute.dispute);
    }
    return { status: "committed" };
  }

  /** Compare-and-swap of the selection row; `null` when this call won. */
  private async writeSelection(
    db: PgQuery,
    transition: SelectionTransition,
  ): Promise<CommitSelectionTransitionResult | null> {
    const { selection, expectedVersion } = transition;
    const won =
      expectedVersion === 0
        ? await db.query(
            `INSERT INTO official_match_selections (
               id, encounter_id, organization_id, competition_id, status, version, round,
               current_proposal_id, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT DO NOTHING`,
            [
              selection.id,
              selection.encounterId,
              selection.organizationId,
              selection.competitionId,
              selection.status,
              selection.version,
              selection.round,
              selection.currentProposalId,
              selection.createdAt.toISOString(),
              selection.updatedAt.toISOString(),
            ],
          )
        : await db.query(
            `UPDATE official_match_selections
             SET status = $3, version = $4, round = $5, current_proposal_id = $6, updated_at = $7
             WHERE id = $1 AND version = $2 AND superseded_at IS NULL`,
            [
              selection.id,
              expectedVersion,
              selection.status,
              selection.version,
              selection.round,
              selection.currentProposalId,
              selection.updatedAt.toISOString(),
            ],
          );
    if (won.rowCount === 1) return null;

    const current = await db.query(
      `SELECT version FROM official_match_selections
       WHERE id = $1 OR (encounter_id = $2 AND superseded_at IS NULL)
       ORDER BY (id = $1) DESC
       LIMIT 1`,
      [selection.id, selection.encounterId],
    );
    return {
      status: "version_conflict",
      currentVersion: Number(current.rows[0]?.version ?? 0),
    };
  }

  /** Acquires then releases claims; returns the conflicting reference if one is owned elsewhere. */
  private async applyReferenceClaims(
    db: PgQuery,
    transition: SelectionTransition,
  ): Promise<CommitSelectionTransitionResult | null> {
    const { selection } = transition;
    const at = transitionTime(transition).toISOString();

    for (const ref of sortedUniqueReferences(transition.references.acquire)) {
      if (!(await this.acquireClaim(db, transition, ref, at))) {
        return { status: "reference_claimed", providerMatchRef: ref };
      }
    }

    const { release } = transition.references;
    if (release === "none") return null;
    const keep = release === "all" ? [] : release.keep.map(externalReferenceKey);
    await db.query(
      `UPDATE official_selection_reference_claims
       SET released_at = $2, release_reason = $3
       WHERE selection_id = $1
         AND released_at IS NULL
         AND (provider_key || ':' || external_match_id) <> ALL($4::text[])`,
      [selection.id, at, transition.actions.at(-1)?.type ?? null, keep],
    );
    return null;
  }

  private async acquireClaim(
    db: PgQuery,
    transition: SelectionTransition,
    ref: ExternalReference,
    claimedAt: string,
  ): Promise<boolean> {
    const { selection } = transition;
    // A live owner can be released between the conflict and the read-back; retry then.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const inserted = await db.query(
        `INSERT INTO official_selection_reference_claims (
           id, provider_key, external_match_id, selection_id, organization_id, competition_id,
           encounter_id, claimed_by_proposal_id, claimed_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (provider_key, external_match_id) WHERE released_at IS NULL DO NOTHING`,
        [
          randomUUID(),
          ref.providerKey,
          ref.externalId,
          selection.id,
          selection.organizationId,
          selection.competitionId,
          selection.encounterId,
          selection.currentProposalId ?? transition.newProposals.at(-1)?.id ?? null,
          claimedAt,
        ],
      );
      if (inserted.rowCount === 1) return true;

      const owner = await db.query(
        `SELECT selection_id FROM official_selection_reference_claims
         WHERE provider_key = $1 AND external_match_id = $2 AND released_at IS NULL`,
        [ref.providerKey, ref.externalId],
      );
      const ownerId = owner.rows[0]?.selection_id;
      if (ownerId === selection.id) return true;
      if (ownerId !== undefined) return false;
    }
    return false;
  }
}
