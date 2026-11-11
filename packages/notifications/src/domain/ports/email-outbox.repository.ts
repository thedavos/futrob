import type { EmailDelivery, EmailDeliveryOutcome } from "../entities/email-delivery.ts";
import type { EmailMessage } from "./email-sender.port.ts";

/**
 * Email outbox. `enqueue` runs inside the transaction of the command that produced the
 * fact, so the email exists exactly when the fact does.
 */
export interface EmailOutboxRepository {
  /** Inserts new deliveries; an existing `(eventId, channel, recipient)` is kept as is. */
  enqueue(deliveries: readonly EmailDelivery[]): Promise<void>;
  /**
   * Claims pending deliveries due at `now`, oldest first: each claim counts one attempt and
   * moves `nextAttemptAt` to `leaseUntil`, so a concurrent runner does not take it again.
   */
  claimDue(input: {
    readonly now: Date;
    readonly leaseUntil: Date;
    readonly limit: number;
  }): Promise<readonly EmailDelivery[]>;
  /**
   * Pins the request of a pending delivery before its first send and returns the pinned
   * one: a delivery that already has a request keeps it, whatever `message` says.
   */
  pinMessage(id: string, message: EmailMessage): Promise<EmailMessage>;
  settle(id: string, outcome: EmailDeliveryOutcome): Promise<void>;
  listByEvent(eventId: string): Promise<readonly EmailDelivery[]>;
}
