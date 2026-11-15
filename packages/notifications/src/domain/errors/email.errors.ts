import { TaggedError } from "@futrob/shared-kernel";

/**
 * A provider refused or could not take an email. `retryable` failures (rate limits,
 * outages, timeouts) are tried again with backoff; the rest end the delivery.
 */
export class EmailSendFailed extends TaggedError("EmailSendFailed")<{
  code: "notifications.email_send_failed";
  message: string;
  retryable: boolean;
}> {}

export class UnknownUnsubscribeToken extends TaggedError("UnknownUnsubscribeToken")<{
  code: "notifications.unknown_unsubscribe_token";
  message: string;
}> {}
