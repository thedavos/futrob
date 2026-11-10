import type { ActorId, ClockPort, IdGeneratorPort } from "@futrob/shared-kernel";
import {
  EMAIL_CLAIM_LEASE_MINUTES,
  EMAIL_SKIP_REASON,
  nextEmailAttemptAt,
  type EmailDelivery,
  type EmailDeliveryOutcome,
  type EmailSkipReason,
} from "../../domain/entities/email-delivery.ts";
import { isCriticalEmail } from "../../domain/entities/email-intent.ts";
import {
  defaultEmailPreferences,
  type EmailPreferences,
} from "../../domain/entities/email-preferences.ts";
import type { EmailOutboxRepository } from "../../domain/ports/email-outbox.repository.ts";
import type { EmailPreferencesRepository } from "../../domain/ports/email-preferences.repository.ts";
import type {
  EmailChannelAccessPort,
  EmailContact,
  EmailContactsPort,
} from "../../domain/ports/email-recipients.port.ts";
import type { EmailSenderPort } from "../../domain/ports/email-sender.port.ts";
import { renderEmail } from "../../domain/templates/render-email.ts";

export const EMAIL_DISPATCH_BATCH = 50;

export interface DispatchEmailsOutput {
  readonly sent: number;
  readonly retried: number;
  readonly failed: number;
  readonly skipped: number;
}

export interface EmailLinks {
  readonly webBaseUrl: string;
  unsubscribeUrl(token: string): string;
}

/**
 * Sends the due emails of the outbox. Every claimed delivery settles as sent, skipped,
 * failed or retried with backoff, so a provider outage only delays email: the command
 * that produced the fact committed long before.
 */
export class DispatchEmailsUseCase {
  constructor(
    private readonly deps: {
      readonly outbox: EmailOutboxRepository;
      readonly sender: EmailSenderPort;
      readonly contacts: EmailContactsPort;
      readonly preferences: EmailPreferencesRepository;
      readonly channelAccess: EmailChannelAccessPort;
      readonly links: EmailLinks;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(input: { readonly limit?: number } = {}): Promise<DispatchEmailsOutput> {
    const now = this.deps.clock.now();
    const claimed = await this.deps.outbox.claimDue({
      now,
      leaseUntil: new Date(now.getTime() + EMAIL_CLAIM_LEASE_MINUTES * 60_000),
      limit: input.limit ?? EMAIL_DISPATCH_BATCH,
    });
    const contacts = new Map(
      (
        await this.deps.contacts.listByActorIds([
          ...new Set(claimed.map((delivery) => delivery.recipientActorId)),
        ])
      ).map((contact) => [contact.actorId, contact]),
    );
    const totals = { sent: 0, retried: 0, failed: 0, skipped: 0 };
    for (const delivery of claimed) {
      const outcome = await this.attempt(delivery, contacts.get(delivery.recipientActorId));
      await this.deps.outbox.settle(delivery.id, outcome);
      totals[OUTCOME_TOTAL[outcome.kind]] += 1;
    }
    return totals;
  }

  private async attempt(
    delivery: EmailDelivery,
    contact: EmailContact | undefined,
  ): Promise<EmailDeliveryOutcome> {
    const skipped = (reason: EmailSkipReason): EmailDeliveryOutcome => ({
      kind: "skipped",
      reason,
      at: this.deps.clock.now(),
    });
    if (!(await this.deps.channelAccess.allowsEmail(delivery.organizationId))) {
      return skipped(EMAIL_SKIP_REASON.planWithoutEmail);
    }
    const preferences = await this.preferencesOf(delivery.recipientActorId);
    if (!isCriticalEmail(delivery.intent.template) && !preferences.nonCriticalEmail) {
      return skipped(EMAIL_SKIP_REASON.optedOut);
    }
    if (!contact) return skipped(EMAIL_SKIP_REASON.noAddress);

    const rendered = renderEmail({
      intent: delivery.intent,
      locale: preferences.locale,
      recipientName: contact.displayName,
      webBaseUrl: this.deps.links.webBaseUrl,
      unsubscribeUrl: this.deps.links.unsubscribeUrl(preferences.unsubscribeToken),
    });
    const sent = await this.deps.sender.send({
      to: contact.email,
      ...rendered,
      idempotencyKey: `email-delivery/${delivery.id}`,
    });
    const at = this.deps.clock.now();
    if (sent.isOk()) return { kind: "sent", providerMessageId: sent.value.providerMessageId, at };
    const nextAttemptAt = sent.error.retryable ? nextEmailAttemptAt(delivery.attempts, at) : null;
    return nextAttemptAt
      ? { kind: "retry", error: sent.error.message, nextAttemptAt }
      : { kind: "failed", error: sent.error.message, at };
  }

  private async preferencesOf(actorId: ActorId): Promise<EmailPreferences> {
    return (
      (await this.deps.preferences.findByActor(actorId)) ??
      this.deps.preferences.insertIfAbsent(
        defaultEmailPreferences({
          actorId,
          unsubscribeToken: this.deps.ids.generate(),
          now: this.deps.clock.now(),
        }),
      )
    );
  }
}

const OUTCOME_TOTAL = {
  sent: "sent",
  retry: "retried",
  failed: "failed",
  skipped: "skipped",
} as const satisfies Record<EmailDeliveryOutcome["kind"], keyof DispatchEmailsOutput>;
