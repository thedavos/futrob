import {
  addDays,
  err,
  ok,
  type ActorId,
  type ClockPort,
  type EventPublisherPort,
  type Result,
  type TransactionPort,
} from "@futrob/shared-kernel";
import {
  AccountDeleted,
  AccountDeletionBlocked,
  AccountReauthenticationFailed,
} from "../../domain/errors/account-deletion.errors.ts";
import type {
  AccountDeletionBlockersPort,
  AccountDeletionRepository,
  ActorSessionsPort,
  CredentialVerifierPort,
} from "../../domain/ports/account-deletion.port.ts";
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  ACTOR_DELETED_EVENT,
  type AccountDeletionBlocker,
  type AccountDeletionState,
  type ActorDeletedEvent,
} from "../../domain/value-objects/account-deletion.ts";

/** What the account holder sees: where the account is, and what stands in the way. */
export interface AccountDeletionStatus {
  readonly state: Exclude<AccountDeletionState, { kind: "deleted" }>;
  readonly blockers: readonly AccountDeletionBlocker[];
}

/**
 * A deleted actor has no credentials left, so only service callers (CLI, jobs) can still ask
 * about it: they get an explicit refusal rather than an account that looks active.
 */
function visibleStatus(
  state: AccountDeletionState,
  blockers: readonly AccountDeletionBlocker[],
): Result<AccountDeletionStatus, AccountDeleted> {
  if (state.kind === "deleted") {
    return err(
      new AccountDeleted({
        code: "identity.account_deleted",
        message: "This account was deleted",
      }),
    );
  }
  return ok({ state, blockers });
}

export class GetAccountDeletionStatusUseCase {
  constructor(
    private readonly accounts: AccountDeletionRepository,
    private readonly blockers: AccountDeletionBlockersPort,
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
  }): Promise<Result<AccountDeletionStatus, AccountDeleted>> {
    const [state, blockers] = await Promise.all([
      this.accounts.findState(input.actorId),
      this.blockers.listBlockers(input.actorId),
    ]);
    return visibleStatus(state, blockers);
  }
}

export interface RequestAccountDeletionInput {
  readonly actorId: ActorId;
  /** Re-entered by the account holder: a stolen session alone cannot delete the account. */
  readonly password: string;
}

export class RequestAccountDeletionUseCase {
  constructor(
    private readonly deps: {
      readonly accounts: AccountDeletionRepository;
      readonly blockers: AccountDeletionBlockersPort;
      readonly credentials: CredentialVerifierPort;
      readonly sessions: ActorSessionsPort;
      readonly clock: ClockPort;
      readonly graceDays?: number;
    },
  ) {}

  async execute(
    input: RequestAccountDeletionInput,
  ): Promise<
    Result<AccountDeletionStatus, AccountReauthenticationFailed | AccountDeletionBlocked>
  > {
    const verified = await this.deps.credentials.verifyPassword(input);
    if (!verified) {
      return err(
        new AccountReauthenticationFailed({
          code: "identity.reauthentication_failed",
          message: "The password does not match this account",
        }),
      );
    }

    const current = await this.deps.accounts.findState(input.actorId);
    if (current.kind === "scheduled") {
      await this.deps.sessions.revokeAll(input.actorId);
      return ok({ state: current, blockers: [] });
    }

    const blockers = await this.deps.blockers.listBlockers(input.actorId);
    if (blockers.length > 0) {
      return err(
        new AccountDeletionBlocked({
          code: "identity.account_deletion_blocked",
          message: "Resolve the listed responsibilities before deleting the account",
          details: { blockers },
        }),
      );
    }

    const requestedAt = this.deps.clock.now();
    const scheduledFor = addDays(requestedAt, this.deps.graceDays ?? ACCOUNT_DELETION_GRACE_DAYS);
    await this.deps.accounts.schedule({ actorId: input.actorId, requestedAt, scheduledFor });
    await this.deps.sessions.revokeAll(input.actorId);
    return ok({ state: { kind: "scheduled", requestedAt, scheduledFor }, blockers: [] });
  }
}

export class CancelAccountDeletionUseCase {
  constructor(
    private readonly accounts: AccountDeletionRepository,
    private readonly blockers: AccountDeletionBlockersPort,
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
  }): Promise<Result<AccountDeletionStatus, AccountDeleted>> {
    await this.accounts.cancel(input.actorId);
    const [state, blockers] = await Promise.all([
      this.accounts.findState(input.actorId),
      this.blockers.listBlockers(input.actorId),
    ]);
    return visibleStatus(state, blockers);
  }
}

export interface ExecuteAccountDeletionResult {
  readonly deleted: number;
  /** Due accounts kept scheduled because a blocker appeared during the grace period. */
  readonly postponed: number;
}

/**
 * Run by the scheduled job. Each due account is anonymized in its own transaction together
 * with every reaction to `identity.actor-deleted`, so a crash leaves it scheduled and the
 * next run finishes it. Running again finds nothing due.
 */
export class ExecuteAccountDeletionUseCase {
  constructor(
    private readonly deps: {
      readonly accounts: AccountDeletionRepository;
      readonly blockers: AccountDeletionBlockersPort;
      readonly events: EventPublisherPort;
      readonly transaction: TransactionPort;
      readonly clock: ClockPort;
      readonly batchSize?: number;
    },
  ) {}

  async execute(): Promise<ExecuteAccountDeletionResult> {
    const now = this.deps.clock.now();
    const due = await this.deps.accounts.listDue({ now, limit: this.deps.batchSize ?? 25 });
    let deleted = 0;
    let postponed = 0;
    for (const actorId of due) {
      const outcome = await this.deps.transaction.runInTransaction(() =>
        this.deleteOne(actorId, now),
      );
      if (outcome === "deleted") deleted += 1;
      if (outcome === "postponed") postponed += 1;
    }
    return { deleted, postponed };
  }

  private async deleteOne(
    actorId: ActorId,
    now: Date,
  ): Promise<"deleted" | "postponed" | "skipped"> {
    const state = await this.deps.accounts.findState(actorId);
    if (state.kind !== "scheduled" || state.scheduledFor > now) return "skipped";
    if ((await this.deps.blockers.listBlockers(actorId)).length > 0) return "postponed";

    if (!(await this.deps.accounts.anonymize({ actorId, deletedAt: now }))) return "skipped";
    const event: ActorDeletedEvent = {
      eventName: ACTOR_DELETED_EVENT,
      occurredAt: now.toISOString(),
      payload: { actorId },
    };
    await this.deps.events.publish(event);
    return "deleted";
  }
}
