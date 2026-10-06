import type {
  ScheduleChangeCommandReceipt,
  ScheduleChangeCommitOutcome,
  ScheduleChangeTransition,
} from "@futrob/scheduling";
import type { PgExecutor } from "@/adapters/persistence/pg-transaction.ts";
import {
  insertApplication,
  insertDecision,
  insertProposals,
  insertReceipt,
} from "./schedule-change-request-rows.ts";
import {
  idempotencyConflict,
  isReceiptKeyConflict,
} from "./schedule-change-request.write-error.ts";

/**
 * Compare-and-set on the request version, then append the proposal or decision, the
 * receipt and the applied schedule. Nothing is written when the version moved.
 */
export async function writeScheduleChangeTransition(
  executor: PgExecutor,
  transition: ScheduleChangeTransition,
  receipt: ScheduleChangeCommandReceipt,
): Promise<ScheduleChangeCommitOutcome> {
  const { request } = transition;
  const updated = await executor.query(
    `UPDATE schedule_change_requests
     SET status = $3, version = $4, updated_at = $5
     WHERE id = $1 AND organization_id = $2 AND version = $6
     RETURNING id`,
    [
      request.id,
      request.organizationId,
      request.status,
      request.version,
      request.updatedAt.toISOString(),
      transition.expectedVersion,
    ],
  );
  if (!updated.rows[0]) {
    const current = await executor.query<{ version: number }>(
      `SELECT version FROM schedule_change_requests WHERE id = $1 AND organization_id = $2`,
      [request.id, request.organizationId],
    );
    return { kind: "version_conflict", currentVersion: Number(current.rows[0]?.version ?? 0) };
  }

  try {
    if (transition.appendedProposal) {
      await insertProposals(
        executor,
        request,
        [transition.appendedProposal],
        request.proposals.length,
      );
    }
    if (transition.appendedDecision) {
      await insertDecision(executor, request, transition.appendedDecision);
    }
    await insertReceipt(executor, receipt);
    if (transition.appendedApplication) {
      await insertApplication(executor, request, transition.appendedApplication);
    }
  } catch (error) {
    if (error instanceof Error && isReceiptKeyConflict(error)) throw idempotencyConflict();
    throw error;
  }
  return { kind: "committed" };
}
