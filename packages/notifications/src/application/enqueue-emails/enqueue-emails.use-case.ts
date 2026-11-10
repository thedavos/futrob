import type { ActorId, ClockPort, IdGeneratorPort, OrganizationId } from "@futrob/shared-kernel";
import {
  EMAIL_CHANNEL,
  EMAIL_DELIVERY_STATUS,
  type EmailDelivery,
} from "../../domain/entities/email-delivery.ts";
import type { EmailIntent } from "../../domain/entities/email-intent.ts";
import type { EmailOutboxRepository } from "../../domain/ports/email-outbox.repository.ts";
import type {
  EmailAudience,
  EmailRecipientsPort,
} from "../../domain/ports/email-recipients.port.ts";

export interface EmailAudienceIntent {
  readonly audience: EmailAudience;
  readonly intent: EmailIntent;
}

export interface EnqueueEmailsInput {
  /** Identifies the fact. Together with the channel and recipient it makes an email unique. */
  readonly eventId: string;
  readonly organizationId: OrganizationId;
  /** In priority order: an actor in several audiences gets the first intent only. */
  readonly audiences: readonly EmailAudienceIntent[];
  /** Who caused the fact. They do not get an email about their own action. */
  readonly actorId: ActorId;
}

/**
 * Queues one email per recipient actor for a fact. It runs inside the command's
 * transaction and never sends: dispatch is a separate, retried step (ADR-0008).
 */
export class EnqueueEmailsUseCase {
  constructor(
    private readonly deps: {
      readonly outbox: EmailOutboxRepository;
      readonly recipients: EmailRecipientsPort;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(input: EnqueueEmailsInput): Promise<readonly EmailDelivery[]> {
    const now = this.deps.clock.now();
    const intents = new Map<ActorId, EmailIntent>();
    for (const { audience, intent } of input.audiences) {
      for (const actorId of await this.deps.recipients.actorsFor(audience)) {
        if (actorId !== input.actorId && !intents.has(actorId)) intents.set(actorId, intent);
      }
    }
    const deliveries = [...intents].map(([recipientActorId, intent]): EmailDelivery => ({
      id: this.deps.ids.generate(),
      eventId: input.eventId,
      channel: EMAIL_CHANNEL,
      organizationId: input.organizationId,
      recipientActorId,
      intent,
      status: EMAIL_DELIVERY_STATUS.pending,
      attempts: 0,
      nextAttemptAt: now,
      lastError: null,
      skipReason: null,
      providerMessageId: null,
      createdAt: now,
      settledAt: null,
    }));
    if (deliveries.length > 0) await this.deps.outbox.enqueue(deliveries);
    return deliveries;
  }
}
