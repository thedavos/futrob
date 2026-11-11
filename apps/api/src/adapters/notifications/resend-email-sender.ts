import { EmailSendFailed, type EmailMessage, type EmailSenderPort } from "@futrob/notifications";
import { err, ok } from "@futrob/shared-kernel";
import { z } from "zod";

export const RESEND_EMAILS_URL = "https://api.resend.com/emails";

const sentSchema = z.object({ id: z.string().min(1) });
const errorSchema = z.object({ name: z.string() });

/** 409 when the first request with the key is still in flight: retrying later succeeds. */
const CONCURRENT_IDEMPOTENT_REQUESTS = "concurrent_idempotent_requests";

/**
 * Resend over its HTTP API (ADR-0028). The `Idempotency-Key` header makes Resend return the
 * first result for a retried delivery instead of sending it again, as long as the body is the
 * same: the outbox pins the request and the body is serialized in a stable order. Rate limits,
 * a concurrent request with the same key, server errors and network failures are retryable;
 * any other refusal, including `invalid_idempotent_request` (another body under the key), ends
 * the delivery. Error messages never carry the recipient or the body.
 */
export class ResendEmailSender implements EmailSenderPort {
  constructor(
    private readonly deps: {
      readonly fetcher: typeof fetch;
      readonly apiKey: string;
      /** `Futrob <avisos@futrob.app>`: an address on the verified sending domain. */
      readonly from: string;
      readonly timeoutMs: number;
    },
  ) {}

  async send(message: EmailMessage) {
    let response: Response;
    try {
      response = await this.deps.fetcher(RESEND_EMAILS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.deps.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": message.idempotencyKey,
        },
        body: JSON.stringify({
          from: this.deps.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          headers: Object.fromEntries(
            Object.entries(message.headers).sort(([left], [right]) =>
              left < right ? -1 : left > right ? 1 : 0,
            ),
          ),
        }),
        signal: AbortSignal.timeout(this.deps.timeoutMs),
      });
    } catch (cause) {
      const timedOut = cause instanceof Error && cause.name === "TimeoutError";
      return err(failure(timedOut ? "Resend timed out" : "Resend unreachable", true));
    }
    if (response.ok) {
      const parsed = sentSchema.safeParse(await response.json().catch(() => null));
      return parsed.success
        ? ok({ providerMessageId: parsed.data.id })
        : err(failure("Resend answered without a message id", true));
    }
    if (response.status === 409) {
      const parsed = errorSchema.safeParse(await response.json().catch(() => null));
      const name = parsed.success ? parsed.data.name : "conflict";
      return err(
        failure(
          `Resend refused the email with HTTP 409 ${name}`,
          name === CONCURRENT_IDEMPOTENT_REQUESTS,
        ),
      );
    }
    const retryable = response.status === 429 || response.status >= 500;
    return err(failure(`Resend refused the email with HTTP ${response.status}`, retryable));
  }
}

function failure(message: string, retryable: boolean): EmailSendFailed {
  return new EmailSendFailed({ code: "notifications.email_send_failed", message, retryable });
}
