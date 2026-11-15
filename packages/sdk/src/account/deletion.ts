import type { AccountDeletionBlockerDto, AccountDeletionStatusDto } from "@futrob/api-contracts";

/**
 * Days between asking and deletion, for copy shown before the request. The product API owns
 * the real date (`ACCOUNT_DELETION_GRACE_DAYS` in `@futrob/identity`) and returns it once
 * the deletion is scheduled.
 */
export const ACCOUNT_DELETION_GRACE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** When the account would be deleted if the holder confirmed at `now`. */
export function projectedAccountDeletionDate(now: Date): Date {
  return new Date(now.getTime() + ACCOUNT_DELETION_GRACE_DAYS * DAY_MS);
}

/**
 * What a signed-in client may show. During the grace period the person only sees the date
 * and the way to cancel; nothing else of the product.
 */
export type AccountDeletionGate =
  | { readonly kind: "open" }
  | { readonly kind: "scheduled"; readonly scheduledFor: Date };

export function accountDeletionGate(
  status: AccountDeletionStatusDto | null | undefined,
): AccountDeletionGate {
  return status?.deletion.status === "scheduled"
    ? { kind: "scheduled", scheduledFor: new Date(status.deletion.scheduledFor) }
    : { kind: "open" };
}

/** What the request can do next: blockers first, since the API would refuse with 409. */
export type AccountDeletionAvailability =
  | { readonly kind: "available" }
  | { readonly kind: "blocked"; readonly blockers: readonly AccountDeletionBlockerDto[] }
  | { readonly kind: "scheduled"; readonly scheduledFor: Date };

export function accountDeletionAvailability(
  status: AccountDeletionStatusDto,
): AccountDeletionAvailability {
  if (status.deletion.status === "scheduled") {
    return { kind: "scheduled", scheduledFor: new Date(status.deletion.scheduledFor) };
  }
  return status.blockers.length > 0
    ? { kind: "blocked", blockers: status.blockers }
    : { kind: "available" };
}
