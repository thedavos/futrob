import type { EmailMessage, EmailSenderPort } from "@futrob/notifications";
import { ok } from "@futrob/shared-kernel";

/**
 * Local and test sender: keeps every message in memory and never leaves the process.
 * A repeated idempotency key returns the first message id, like a provider that honors it.
 */
export class InMemoryEmailSender implements EmailSenderPort {
  readonly outbox: EmailMessage[] = [];
  private readonly ids = new Map<string, string>();

  async send(message: EmailMessage) {
    const known = this.ids.get(message.idempotencyKey);
    if (known) return ok({ providerMessageId: known });
    this.outbox.push(message);
    const providerMessageId = `memory-${this.outbox.length}`;
    this.ids.set(message.idempotencyKey, providerMessageId);
    return ok({ providerMessageId });
  }
}
