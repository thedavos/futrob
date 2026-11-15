import type { Result } from "@futrob/shared-kernel";
import type { EmailSendFailed } from "../errors/email.errors.ts";

/** A rendered email, ready for a provider. */
export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  /** Extra headers such as `List-Unsubscribe`. */
  readonly headers: Readonly<Record<string, string>>;
  /** Stable per delivery: a provider that honors it never sends a retry twice. */
  readonly idempotencyKey: string;
}

/** Provider-neutral send. Adapters live in apps; the domain never calls a provider SDK. */
export interface EmailSenderPort {
  send(
    message: EmailMessage,
  ): Promise<Result<{ readonly providerMessageId: string }, EmailSendFailed>>;
}
