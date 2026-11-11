import { TaggedError } from "@futrob/shared-kernel";
import type { AccountDeletionBlocker } from "../value-objects/account-deletion.ts";

export class AccountReauthenticationFailed extends TaggedError("AccountReauthenticationFailed")<{
  code: "identity.reauthentication_failed";
  message: string;
}> {}

export class AccountDeletionBlocked extends TaggedError("AccountDeletionBlocked")<{
  code: "identity.account_deletion_blocked";
  message: string;
  /** Sent as the wire `details` of the 409 so clients can explain the next step. */
  details: { blockers: readonly AccountDeletionBlocker[] };
}> {}

/** The account was deleted: nothing about it can be read or changed any more (ADR-0029). */
export class AccountDeleted extends TaggedError("AccountDeleted")<{
  code: "identity.account_deleted";
  message: string;
}> {}
