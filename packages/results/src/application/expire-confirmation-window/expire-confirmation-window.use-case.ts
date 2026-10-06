import {
  err,
  ok,
  Panic,
  type ActorId,
  type ClockPort,
  type EncounterId,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import type { OfficialMatchSelectionRepository } from "../../domain/ports/official-result.repository.ts";
import type { SelectionVersionConflict } from "../../domain/errors/official-selection.errors.ts";
import { confirmationWindowGuard } from "../../domain/policies/confirmation-window.ts";
import { buildAction, versionConflict } from "../selection-command-support.ts";

export interface ExpireConfirmationWindowInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
  readonly proposalId: string;
}

export interface ExpireConfirmationWindowOutput {
  readonly status: "expired" | "skipped";
}

export class ExpireConfirmationWindowUseCase {
  constructor(
    private readonly deps: {
      readonly selections: OfficialMatchSelectionRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(
    input: ExpireConfirmationWindowInput,
  ): Promise<Result<ExpireConfirmationWindowOutput, SelectionVersionConflict>> {
    const selection = await this.deps.selections.findLatestByEncounter(input.encounterId);
    if (
      !selection ||
      selection.organizationId !== input.organizationId ||
      selection.status !== "awaiting_opponent_confirmation" ||
      selection.currentProposalId !== input.proposalId
    )
      return ok({ status: "skipped" });
    const proposal = (await this.deps.selections.listProposals(selection.id)).find(
      (row) => row.id === input.proposalId,
    );
    if (!proposal)
      throw new Panic("Pending selection must have its immutable proposal and deadline");
    const now = this.deps.clock.now();
    if (!confirmationWindowGuard(proposal, now)) return ok({ status: "skipped" });
    const version = selection.version + 1;
    const action = buildAction(
      {
        ...this.deps,
        organizationId: selection.organizationId,
        competitionId: selection.competitionId,
        encounterId: selection.encounterId,
        actor: { capacity: "system", actorId: input.actorId },
        commandKey: null,
        fingerprint: null,
      },
      {
        type: "confirmation_expired",
        selectionId: selection.id,
        proposalId: proposal.id,
        fromStatus: "awaiting_opponent_confirmation",
        toStatus: "organizer_review",
        versionBefore: selection.version,
        versionAfter: version,
        occurredAt: now,
        details: {
          confirmationDeadline: proposal.confirmationDeadline.toISOString(),
          processedAt: now.toISOString(),
        },
      },
    );
    const committed = await this.deps.selections.commitTransition({
      expectedVersion: selection.version,
      selection: { ...selection, status: "organizer_review", version, updatedAt: now },
      newProposals: [],
      actions: [action],
      dispute: null,
      references: { acquire: [], release: "none" },
    });
    if (committed.status === "version_conflict")
      return err(versionConflict(selection.version, committed.currentVersion));
    if (committed.status === "reference_claimed")
      throw new Panic("Expiry never acquires references");
    return ok({ status: "expired" });
  }
}
