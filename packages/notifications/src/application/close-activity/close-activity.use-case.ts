import { ok, type ActorId, type ClockPort, type Result } from "@futrob/shared-kernel";
import type { ActivityAudienceRef, ActivitySource } from "../../domain/entities/activity-entry.ts";
import type { ActivityEntryRepository } from "../../domain/ports/activity-entry.repository.ts";

export interface CloseActivityInput {
  readonly source: ActivitySource;
  /** Only this audience; every audience of the source when absent. */
  readonly audience?: ActivityAudienceRef;
  /** Null when the system closes it, for example on expiry. */
  readonly closedByActorId: ActorId | null;
  /** When the fact ended; the clock when absent. */
  readonly closedAt?: Date;
}

export interface CloseActivityOutput {
  readonly closed: number;
}

/**
 * Closes the open rows of a source. Closing an unknown or already closed source changes
 * nothing and still succeeds: competitive commands never fail because of their activity.
 */
export class CloseActivityUseCase {
  constructor(
    private readonly deps: {
      readonly activities: ActivityEntryRepository;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(input: CloseActivityInput): Promise<Result<CloseActivityOutput, never>> {
    const closed = await this.deps.activities.close({
      source: input.source,
      audience: input.audience,
      closedAt: input.closedAt ?? this.deps.clock.now(),
      closedByActorId: input.closedByActorId,
    });
    return ok({ closed });
  }
}
