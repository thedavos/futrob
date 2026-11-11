import type { ActorId, OrganizationId } from "@futrob/shared-kernel";
import type { EmailMessage } from "../ports/email-sender.port.ts";
import type { EmailIntent } from "./email-intent.ts";

export const EMAIL_CHANNEL = "email";

export const EMAIL_DELIVERY_STATUS = {
  pending: "pending",
  sent: "sent",
  skipped: "skipped",
  failed: "failed",
} as const;

export type EmailDeliveryStatus =
  (typeof EMAIL_DELIVERY_STATUS)[keyof typeof EMAIL_DELIVERY_STATUS];

/** Why a delivery ended without a send. Each reason is final for that delivery. */
export const EMAIL_SKIP_REASON = {
  /** The organization's plan does not include the email channel. */
  planWithoutEmail: "plan_without_email",
  /** The recipient opted out of non-critical email. */
  optedOut: "opted_out",
  /** The recipient has no email address on record. */
  noAddress: "no_address",
} as const;

export type EmailSkipReason = (typeof EMAIL_SKIP_REASON)[keyof typeof EMAIL_SKIP_REASON];

/**
 * One email for one recipient about one fact. `(eventId, channel, recipientActorId)` is
 * unique, so a replayed fact never queues a second email (ADR-0008).
 */
export interface EmailDelivery {
  readonly id: string;
  readonly eventId: string;
  readonly channel: typeof EMAIL_CHANNEL;
  readonly organizationId: OrganizationId;
  readonly recipientActorId: ActorId;
  readonly intent: EmailIntent;
  readonly status: EmailDeliveryStatus;
  /** Send attempts started, including one in flight. */
  readonly attempts: number;
  /** When a pending delivery may be claimed. A claim leases it until then. */
  readonly nextAttemptAt: Date;
  readonly lastError: string | null;
  readonly skipReason: EmailSkipReason | null;
  readonly providerMessageId: string | null;
  /**
   * The request sent under this delivery's idempotency key, pinned before the first send.
   * Retries resend it as is, so a send the provider accepted but whose answer was lost is
   * recovered even if the recipient's address, name or locale changed since.
   */
  readonly message: EmailMessage | null;
  readonly createdAt: Date;
  readonly settledAt: Date | null;
}

/** How one claimed attempt ended. */
export type EmailDeliveryOutcome =
  | { readonly kind: "sent"; readonly providerMessageId: string; readonly at: Date }
  | { readonly kind: "retry"; readonly error: string; readonly nextAttemptAt: Date }
  | { readonly kind: "failed"; readonly error: string; readonly at: Date }
  | { readonly kind: "skipped"; readonly reason: EmailSkipReason; readonly at: Date };

/** Minutes to wait after each failed attempt. A failure after the last one is final. */
export const EMAIL_RETRY_DELAYS_MINUTES = [1, 5, 15, 60, 240, 720] as const;

/** A claimed delivery that crashes mid-send becomes claimable again after this lease. */
export const EMAIL_CLAIM_LEASE_MINUTES = 5;

/** When to try again after `attempts` failed attempts, or `null` when retries are exhausted. */
export function nextEmailAttemptAt(attempts: number, failedAt: Date): Date | null {
  const minutes = EMAIL_RETRY_DELAYS_MINUTES[attempts - 1];
  if (minutes === undefined) return null;
  return new Date(failedAt.getTime() + minutes * 60_000);
}
