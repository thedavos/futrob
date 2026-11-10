import type { ActorId } from "@futrob/shared-kernel";
import type { EmailPreferences } from "../entities/email-preferences.ts";

export interface EmailPreferencesRepository {
  findByActor(actorId: ActorId): Promise<EmailPreferences | null>;
  findByUnsubscribeToken(token: string): Promise<EmailPreferences | null>;
  /** Stores `preferences` unless the actor has a row; returns the stored row either way. */
  insertIfAbsent(preferences: EmailPreferences): Promise<EmailPreferences>;
  save(preferences: EmailPreferences): Promise<EmailPreferences>;
}
