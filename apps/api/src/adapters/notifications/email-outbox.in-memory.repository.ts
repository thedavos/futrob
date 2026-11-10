import {
  EMAIL_DELIVERY_STATUS,
  type EmailDelivery,
  type EmailDeliveryOutcome,
  type EmailOutboxRepository,
} from "@futrob/notifications";

/** Process-local outbox with the same contract as the Postgres adapter. */
export class InMemoryEmailOutboxRepository implements EmailOutboxRepository {
  private rows: EmailDelivery[] = [];

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

  async claimDue(input: {
    readonly now: Date;
    readonly leaseUntil: Date;
    readonly limit: number;
  }): Promise<readonly EmailDelivery[]> {
    const claimed = this.rows
      .filter(
        (row) =>
          row.status === EMAIL_DELIVERY_STATUS.pending &&
          row.nextAttemptAt.getTime() <= input.now.getTime(),
      )
      .sort(
        (left, right) =>
          left.nextAttemptAt.getTime() - right.nextAttemptAt.getTime() ||
          (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
      )
      .slice(0, input.limit)
      .map((row) => ({ ...row, attempts: row.attempts + 1, nextAttemptAt: input.leaseUntil }));
    for (const row of claimed) this.replace(row);
    return claimed;
  }

  async settle(id: string, outcome: EmailDeliveryOutcome): Promise<void> {
    const row = this.rows.find((candidate) => candidate.id === id);
    if (!row || row.status !== EMAIL_DELIVERY_STATUS.pending) return;
    this.replace(settled(row, outcome));
  }

  async listByEvent(eventId: string): Promise<readonly EmailDelivery[]> {
    return this.rows
      .filter((row) => row.eventId === eventId)
      .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  }

  private replace(next: EmailDelivery): void {
    this.rows = this.rows.map((row) => (row.id === next.id ? next : row));
  }
}

function settled(row: EmailDelivery, outcome: EmailDeliveryOutcome): EmailDelivery {
  switch (outcome.kind) {
    case "sent":
      return {
        ...row,
        status: EMAIL_DELIVERY_STATUS.sent,
        providerMessageId: outcome.providerMessageId,
        settledAt: outcome.at,
      };
    case "retry":
      return { ...row, lastError: outcome.error, nextAttemptAt: outcome.nextAttemptAt };
    case "failed":
      return {
        ...row,
        status: EMAIL_DELIVERY_STATUS.failed,
        lastError: outcome.error,
        settledAt: outcome.at,
      };
    case "skipped":
      return {
        ...row,
        status: EMAIL_DELIVERY_STATUS.skipped,
        skipReason: outcome.reason,
        settledAt: outcome.at,
      };
  }
}
