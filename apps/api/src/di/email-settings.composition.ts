import type { ApiEnv } from "@/config/env.ts";
import { ResendEmailSender } from "@/adapters/notifications/resend-email-sender.ts";
import type { EmailSettings } from "@/di/notifications.module.ts";

const RESEND_TIMEOUT_MS = 10_000;

/**
 * Resend when both its key and the sender are set. Otherwise development keeps email in
 * memory, and production sends nothing: queued email waits, pending, for a provider.
 */
export function emailSettingsFrom(
  env: Pick<ApiEnv, "nodeEnv" | "resendApiKey" | "emailFrom" | "webBaseUrl">,
  fetcher: typeof fetch,
): EmailSettings {
  if (env.resendApiKey && env.emailFrom) {
    return {
      webBaseUrl: env.webBaseUrl,
      sender: new ResendEmailSender({
        fetcher,
        apiKey: env.resendApiKey,
        from: env.emailFrom,
        timeoutMs: RESEND_TIMEOUT_MS,
      }),
    };
  }
  return { webBaseUrl: env.webBaseUrl, sender: env.nodeEnv === "production" ? null : "memory" };
}
