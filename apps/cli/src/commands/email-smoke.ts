import { Effect } from "effect";
import {
  DispatchEmailsUseCase,
  EmailSendFailed,
  EnqueueEmailsUseCase,
  type EmailDelivery,
  type EmailDeliveryOutcome,
  type EmailMessage,
  type EmailOutboxRepository,
  type EmailPreferences,
  type EmailPreferencesRepository,
  type EmailSenderPort,
  type EnqueueEmailsInput,
} from "@futrob/notifications";
import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  err,
  ok,
  type ActorId,
} from "@futrob/shared-kernel";
import { print, printJson } from "../lib/print.ts";

const ORG = asOrganizationId("org_smoke");
const CAPTAIN = asActorId("act_captain");
const PROPOSER = asActorId("act_proposer");

/** In-process outbox: one row per `(eventId, channel, recipient)`, as the Postgres table. */
class SmokeOutbox implements EmailOutboxRepository {
  rows: EmailDelivery[] = [];

  async enqueue(deliveries: readonly EmailDelivery[]): Promise<void> {
    for (const delivery of deliveries) {
      const duplicate = this.rows.some(
        (row) =>
          row.eventId === delivery.eventId &&
          row.channel === delivery.channel &&
          row.recipientActorId === delivery.recipientActorId,
      );
      if (!duplicate) this.rows.push(delivery);
    }
  }

  async claimDue(input: { now: Date; leaseUntil: Date; limit: number }) {
    const due = this.rows
      .filter((row) => row.status === "pending" && row.nextAttemptAt <= input.now)
      .slice(0, input.limit)
      .map((row) => ({ ...row, attempts: row.attempts + 1, nextAttemptAt: input.leaseUntil }));
    for (const claimed of due) this.replace(claimed);
    return due;
  }

  async pinMessage(id: string, message: EmailMessage): Promise<EmailMessage> {
    const row = this.rows.find((candidate) => candidate.id === id);
    if (!row) return message;
    if (row.message) return row.message;
    this.replace({ ...row, message });
    return message;
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

class SmokePreferences implements EmailPreferencesRepository {
  private readonly rows = new Map<ActorId, EmailPreferences>();

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

/** Provider that is down for the first send, then accepts. */
class FlakySender implements EmailSenderPort {
  readonly inbox: EmailMessage[] = [];
  private outages = 1;

  async send(message: EmailMessage) {
    if (this.outages > 0) {
      this.outages -= 1;
      return err(
        new EmailSendFailed({
          code: "notifications.email_send_failed",
          message: "provider unavailable",
          retryable: true,
        }),
      );
    }
    this.inbox.push(message);
    return ok({ providerMessageId: `msg_${this.inbox.length}` });
  }
}

const proposal: EnqueueEmailsInput = {
  eventId: "proposal:prp_smoke",
  organizationId: ORG,
  actorId: PROPOSER,
  audiences: [
    {
      audience: {
        organizationId: ORG,
        competitionId: asCompetitionId("comp_smoke"),
        audience: "team",
        audienceId: "team_rival",
      },
      intent: {
        template: "proposed_selection",
        requiresAction: true,
        path: "/player/competitions/comp_smoke/matches",
        competitionName: "Liga Smoke",
        encounterLabel: "Cuervos vs Halcones",
        teamName: "Halcones",
      },
    },
  ],
};

/**
 * Offline email channel smoke (ADR-0031): fires the same fact twice, reads the outbox,
 * survives a provider outage with a retry, and sends exactly one email.
 */
export function run(): Effect.Effect<number> {
  return Effect.promise(async () => {
    let now = new Date("2026-11-10T10:00:00.000Z");
    const clock = { now: () => now };
    let nextId = 0;
    const ids = { generate: () => `eml_${++nextId}` };
    const outbox = new SmokeOutbox();
    const preferences = new SmokePreferences();
    const sender = new FlakySender();
    const enqueue = new EnqueueEmailsUseCase({
      outbox,
      recipients: { actorsFor: async () => [CAPTAIN] },
      clock,
      ids,
    });
    const dispatch = new DispatchEmailsUseCase({
      outbox,
      sender,
      contacts: {
        listByActorIds: async () => [
          { actorId: CAPTAIN, email: "captain@example.test", displayName: "Capi" },
        ],
      },
      preferences,
      channelAccess: { allowsEmail: async () => true },
      links: {
        webBaseUrl: "https://futrob.test",
        unsubscribeUrl: (token) => `https://futrob.test/email/unsubscribe?token=${token}`,
        oneClickUnsubscribeUrl: (token) =>
          `https://futrob.test/api/v1/public/email/unsubscribe?token=${token}`,
      },
      clock,
      ids,
    });

    await enqueue.execute(proposal);
    await enqueue.execute(proposal);
    const queued = await outbox.listByEvent(proposal.eventId);
    const outage = await dispatch.execute();
    const afterOutage = await outbox.listByEvent(proposal.eventId);
    now = new Date(now.getTime() + 60 * 60_000);
    const recovered = await dispatch.execute();
    const replay = await dispatch.execute();
    const final = await outbox.listByEvent(proposal.eventId);

    const checks = {
      replayQueuedOnce: queued.length === 1,
      outageRetried: outage.retried === 1 && afterOutage[0]?.status === "pending",
      sentAfterRetry: recovered.sent === 1 && final[0]?.status === "sent",
      noSecondEmail: replay.sent === 0 && sender.inbox.length === 1,
    };
    const passed = Object.values(checks).every(Boolean);
    printJson({
      passed,
      checks,
      dispatches: { outage, recovered, replay },
      outbox: final.map((row) => ({
        eventId: row.eventId,
        recipientActorId: row.recipientActorId,
        template: row.intent.template,
        status: row.status,
        attempts: row.attempts,
        providerMessageId: row.providerMessageId,
      })),
      subjects: sender.inbox.map((message) => message.subject),
    });
    print(passed ? "email-smoke: OK" : "email-smoke: FAILED");
    return passed ? 0 : 1;
  });
}
