import { asActorId, err, ok, type ActorId, type OrganizationId } from "@futrob/shared-kernel";
import {
  EMAIL_DELIVERY_STATUS,
  type EmailDelivery,
  type EmailDeliveryOutcome,
} from "../domain/entities/email-delivery.ts";
import type { EmailPreferences } from "../domain/entities/email-preferences.ts";
import { EmailSendFailed } from "../domain/errors/email.errors.ts";
import type { EmailOutboxRepository } from "../domain/ports/email-outbox.repository.ts";
import type { EmailPreferencesRepository } from "../domain/ports/email-preferences.repository.ts";
import type {
  EmailAudience,
  EmailChannelAccessPort,
  EmailContact,
  EmailContactsPort,
  EmailRecipientsPort,
} from "../domain/ports/email-recipients.port.ts";
import type { EmailMessage, EmailSenderPort } from "../domain/ports/email-sender.port.ts";
import { DispatchEmailsUseCase } from "./dispatch-emails/dispatch-emails.use-case.ts";
import { EnqueueEmailsUseCase } from "./enqueue-emails/enqueue-emails.use-case.ts";
import {
  GetEmailPreferencesUseCase,
  SaveEmailPreferencesUseCase,
  UnsubscribeEmailUseCase,
} from "./email-preferences/email-preferences.use-cases.ts";
import { ORG_A, StepClock, at, sequentialIds } from "./activity-memory.test-support.ts";

/** Fake with the outbox contract: unique per event, channel and recipient; claims lease. */
export class MemoryOutbox implements EmailOutboxRepository {
  rows: EmailDelivery[] = [];

  async enqueue(deliveries: readonly EmailDelivery[]): Promise<void> {
    for (const delivery of deliveries) {
      const exists = this.rows.some(
        (row) =>
          row.eventId === delivery.eventId &&
          row.channel === delivery.channel &&
          row.recipientActorId === delivery.recipientActorId,
      );
      if (!exists) this.rows.push(delivery);
    }
  }

  async claimDue(input: { now: Date; leaseUntil: Date; limit: number }) {
    const due = this.rows
      .filter(
        (row) =>
          row.status === EMAIL_DELIVERY_STATUS.pending &&
          row.nextAttemptAt.getTime() <= input.now.getTime(),
      )
      .slice(0, input.limit)
      .map((row) => ({ ...row, attempts: row.attempts + 1, nextAttemptAt: input.leaseUntil }));
    for (const claimed of due) this.replace(claimed);
    return due;
  }

  async settle(id: string, outcome: EmailDeliveryOutcome): Promise<void> {
    const row = this.rows.find((candidate) => candidate.id === id);
    if (!row) return;
    switch (outcome.kind) {
      case "sent":
        return this.replace({
          ...row,
          status: "sent",
          providerMessageId: outcome.providerMessageId,
          settledAt: outcome.at,
        });
      case "retry":
        return this.replace({
          ...row,
          lastError: outcome.error,
          nextAttemptAt: outcome.nextAttemptAt,
        });
      case "failed":
        return this.replace({
          ...row,
          status: "failed",
          lastError: outcome.error,
          settledAt: outcome.at,
        });
      case "skipped":
        return this.replace({
          ...row,
          status: "skipped",
          skipReason: outcome.reason,
          settledAt: outcome.at,
        });
    }
  }

  async listByEvent(eventId: string) {
    return this.rows.filter((row) => row.eventId === eventId);
  }

  private replace(next: EmailDelivery): void {
    this.rows = this.rows.map((row) => (row.id === next.id ? next : row));
  }
}

export class MemoryPreferences implements EmailPreferencesRepository {
  readonly rows = new Map<ActorId, EmailPreferences>();

  async findByActor(actorId: ActorId) {
    return this.rows.get(actorId) ?? null;
  }
  async findByUnsubscribeToken(token: string) {
    return [...this.rows.values()].find((row) => row.unsubscribeToken === token) ?? null;
  }
  async insertIfAbsent(preferences: EmailPreferences) {
    const existing = this.rows.get(preferences.actorId);
    if (existing) return existing;
    this.rows.set(preferences.actorId, preferences);
    return preferences;
  }
  async save(preferences: EmailPreferences) {
    this.rows.set(preferences.actorId, preferences);
    return preferences;
  }
}

/** Sends to an inbox, or fails the next sends with the queued failures. */
export class MemorySender implements EmailSenderPort {
  readonly inbox: EmailMessage[] = [];
  readonly failures: { retryable: boolean }[] = [];

  async send(message: EmailMessage) {
    const failure = this.failures.shift();
    if (failure) {
      return err(
        new EmailSendFailed({
          code: "notifications.email_send_failed",
          message: failure.retryable ? "provider unavailable" : "recipient rejected",
          retryable: failure.retryable,
        }),
      );
    }
    this.inbox.push(message);
    return ok({ providerMessageId: `msg-${this.inbox.length}` });
  }
}

export const CAPTAIN = asActorId("act-captain");
export const ORGANIZER = asActorId("act-organizer");
export const STAFF = asActorId("act-staff");

export function emailHarness(
  input: { readonly freeOrganizations?: readonly OrganizationId[] } = {},
) {
  const outbox = new MemoryOutbox();
  const preferences = new MemoryPreferences();
  const sender = new MemorySender();
  const clock = new StepClock(at("10:00"));
  const ids = sequentialIds("eml");
  const audiences = new Map<string, readonly ActorId[]>([
    [`organization:${ORG_A}`, [ORGANIZER, STAFF]],
    ["team:team-rival", [CAPTAIN]],
  ]);
  const recipients: EmailRecipientsPort = {
    async actorsFor(audience: EmailAudience) {
      if (audience.audience === "actor") return [asActorId(audience.audienceId)];
      return audiences.get(`${audience.audience}:${audience.audienceId}`) ?? [];
    },
  };
  const contacts: EmailContact[] = [
    { actorId: CAPTAIN, email: "captain@example.test", displayName: "Capi" },
    { actorId: ORGANIZER, email: "organizer@example.test", displayName: "Orga" },
  ];
  const contactsPort: EmailContactsPort = {
    async listByActorIds(actorIds) {
      return contacts.filter((contact) => actorIds.includes(contact.actorId));
    },
  };
  const free = new Set(input.freeOrganizations ?? []);
  const channelAccess: EmailChannelAccessPort = {
    async allowsEmail(organizationId) {
      return !free.has(organizationId);
    },
  };
  const deps = { preferences, clock, ids };
  return {
    outbox,
    preferences,
    sender,
    clock,
    enqueue: new EnqueueEmailsUseCase({ outbox, recipients, clock, ids }),
    dispatch: new DispatchEmailsUseCase({
      outbox,
      sender,
      contacts: contactsPort,
      preferences,
      channelAccess,
      clock,
      ids,
      links: {
        webBaseUrl: "https://futrob.test",
        unsubscribeUrl: (token) => `https://futrob.test/email/unsubscribe?token=${token}`,
        oneClickUnsubscribeUrl: (token) =>
          `https://futrob.test/api/v1/public/email/unsubscribe?token=${token}`,
      },
    }),
    getPreferences: new GetEmailPreferencesUseCase(deps),
    savePreferences: new SaveEmailPreferencesUseCase(deps),
    unsubscribe: new UnsubscribeEmailUseCase(deps),
  };
}

export { ORG_A };
