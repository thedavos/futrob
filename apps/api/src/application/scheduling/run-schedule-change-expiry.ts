import type {
  ExpireScheduleChangeProposalUseCase,
  ScheduleChangeExpiryFeedPort,
  ScheduleChangeVersionConflict,
} from "@futrob/scheduling";
import {
  err,
  ok,
  TaggedError,
  type ActorId,
  type ClockPort,
  type Result,
} from "@futrob/shared-kernel";

export class ScheduleChangeExpiryActorUnavailable extends TaggedError(
  "ScheduleChangeExpiryActorUnavailable",
)<{
  code: "scheduling.schedule_change_expiry_actor_unavailable";
  message: string;
}> {}

export class RunScheduleChangeExpiry {
  constructor(
    private readonly deps: {
      readonly feed: ScheduleChangeExpiryFeedPort;
      readonly expire: Pick<ExpireScheduleChangeProposalUseCase, "execute">;
      readonly clock: ClockPort;
      readonly resolveSystemActor: () => Promise<ActorId | null>;
    },
  ) {}
  async execute(): Promise<
    Result<
      { readonly escalated: number; readonly skipped: number },
      ScheduleChangeExpiryActorUnavailable | ScheduleChangeVersionConflict
    >
  > {
    const actorId = await this.deps.resolveSystemActor();
    if (!actorId)
      return err(
        new ScheduleChangeExpiryActorUnavailable({
          code: "scheduling.schedule_change_expiry_actor_unavailable",
          message: "SCHEDULING_SYSTEM_ACTOR_ID must reference an actor provisioned by identity",
        }),
      );
    const due = await this.deps.feed.listDue({ dueAt: this.deps.clock.now(), limit: 50 });
    let escalated = 0;
    let skipped = 0;
    for (const request of due) {
      const result = await this.deps.expire.execute({ ...request, actorId });
      if (result.isErr()) return err(result.error);
      if (result.value.status === "escalated") escalated += 1;
      else skipped += 1;
    }
    return ok({ escalated, skipped });
  }
}
