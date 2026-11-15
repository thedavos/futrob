import type { ActorId } from "@futrob/shared-kernel";
import { DEFAULT_EMAIL_LOCALE, type EmailLocale } from "./email-intent.ts";

/** Per-actor email settings. A missing row means the defaults below. */
export interface EmailPreferences {
  readonly actorId: ActorId;
  readonly locale: EmailLocale;
  /** Critical email ignores this switch. */
  readonly nonCriticalEmail: boolean;
  /** Opaque secret in every non-critical email; it only turns non-critical email off. */
  readonly unsubscribeToken: string;
  readonly updatedAt: Date;
}

export function defaultEmailPreferences(input: {
  readonly actorId: ActorId;
  readonly unsubscribeToken: string;
  readonly now: Date;
}): EmailPreferences {
  return {
    actorId: input.actorId,
    locale: DEFAULT_EMAIL_LOCALE,
    nonCriticalEmail: true,
    unsubscribeToken: input.unsubscribeToken,
    updatedAt: input.now,
  };
}
