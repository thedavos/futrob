import {
  err,
  ok,
  type ActorId,
  type ClockPort,
  type IdGeneratorPort,
  type Result,
} from "@futrob/shared-kernel";
import type { EmailLocale } from "../../domain/entities/email-intent.ts";
import {
  defaultEmailPreferences,
  type EmailPreferences,
} from "../../domain/entities/email-preferences.ts";
import { UnknownUnsubscribeToken } from "../../domain/errors/email.errors.ts";
import type { EmailPreferencesRepository } from "../../domain/ports/email-preferences.repository.ts";

interface Deps {
  readonly preferences: EmailPreferencesRepository;
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;
}

/** What an actor sees and changes. The unsubscribe token never leaves the email. */
export interface EmailPreferencesView {
  readonly locale: EmailLocale;
  readonly nonCriticalEmail: boolean;
}

function view(preferences: EmailPreferences): EmailPreferencesView {
  return { locale: preferences.locale, nonCriticalEmail: preferences.nonCriticalEmail };
}

async function current(deps: Deps, actorId: ActorId): Promise<EmailPreferences> {
  return (
    (await deps.preferences.findByActor(actorId)) ??
    deps.preferences.insertIfAbsent(
      defaultEmailPreferences({
        actorId,
        unsubscribeToken: deps.ids.generate(),
        now: deps.clock.now(),
      }),
    )
  );
}

export class GetEmailPreferencesUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(input: { readonly actorId: ActorId }): Promise<EmailPreferencesView> {
    return view(await current(this.deps, input.actorId));
  }
}

export class SaveEmailPreferencesUseCase {
  constructor(private readonly deps: Deps) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly locale: EmailLocale;
    readonly nonCriticalEmail: boolean;
  }): Promise<EmailPreferencesView> {
    const stored = await current(this.deps, input.actorId);
    return view(
      await this.deps.preferences.save({
        ...stored,
        locale: input.locale,
        nonCriticalEmail: input.nonCriticalEmail,
        updatedAt: this.deps.clock.now(),
      }),
    );
  }
}

/** One-click unsubscribe from an email link: no session, only the token. Idempotent. */
export class UnsubscribeEmailUseCase {
  constructor(private readonly deps: Pick<Deps, "preferences" | "clock">) {}

  async execute(input: {
    readonly token: string;
  }): Promise<Result<EmailPreferencesView, UnknownUnsubscribeToken>> {
    const stored = input.token
      ? await this.deps.preferences.findByUnsubscribeToken(input.token)
      : null;
    if (!stored) {
      return err(
        new UnknownUnsubscribeToken({
          code: "notifications.unknown_unsubscribe_token",
          message: "The unsubscribe link is not valid",
        }),
      );
    }
    if (!stored.nonCriticalEmail) return ok(view(stored));
    return ok(
      view(
        await this.deps.preferences.save({
          ...stored,
          nonCriticalEmail: false,
          updatedAt: this.deps.clock.now(),
        }),
      ),
    );
  }
}
