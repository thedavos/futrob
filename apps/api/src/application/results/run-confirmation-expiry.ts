import type {
  ExpireConfirmationWindowInput,
  ExpireConfirmationWindowOutput,
  OfficialMatchSelectionRepository,
  SelectionVersionConflict,
} from "@futrob/results";
import {
  err,
  ok,
  TaggedError,
  type ActorId,
  type ClockPort,
  type Result,
} from "@futrob/shared-kernel";

export class ConfirmationExpiryActorUnavailable extends TaggedError(
  "ConfirmationExpiryActorUnavailable",
)<{
  code: "results.confirmation_expiry_actor_unavailable";
  message: string;
}> {}

export class RunConfirmationExpiry {
  constructor(
    private readonly deps: {
      readonly selections: OfficialMatchSelectionRepository;
      readonly resolveSystemActor: () => Promise<ActorId | null>;
      readonly clock: ClockPort;
      readonly expire: {
        execute(
          input: ExpireConfirmationWindowInput,
        ): Promise<Result<ExpireConfirmationWindowOutput, SelectionVersionConflict>>;
      };
    },
  ) {}

  async execute(): Promise<
    Result<
      { readonly expired: number; readonly skipped: number },
      ConfirmationExpiryActorUnavailable | SelectionVersionConflict
    >
  > {
    const actorId = await this.deps.resolveSystemActor();
    if (!actorId)
      return err(
        new ConfirmationExpiryActorUnavailable({
          code: "results.confirmation_expiry_actor_unavailable",
          message: "RESULTS_SYSTEM_ACTOR_ID must reference an actor provisioned by identity",
        }),
      );
    const due = await this.deps.selections.listDueConfirmations({
      dueAt: this.deps.clock.now(),
      limit: 50,
    });
    let expired = 0;
    let skipped = 0;
    for (const selection of due) {
      if (!selection.currentProposalId) continue;
      const result = await this.deps.expire.execute({
        actorId,
        organizationId: selection.organizationId,
        encounterId: selection.encounterId,
        proposalId: selection.currentProposalId,
      });
      if (result.isErr()) return err(result.error);
      if (result.value.status === "expired") expired += 1;
      else skipped += 1;
    }
    return ok({ expired, skipped });
  }
}
