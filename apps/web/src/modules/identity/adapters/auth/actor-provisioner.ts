import { and, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import {
  CREDENTIAL_IDENTITY_PROVIDER,
  type ActorProvisionerPort,
  type IdentityProviderKey,
} from "@futrob/identity";
import { asActorId, type ActorId } from "@futrob/shared-kernel";
import type { IdGenerator } from "@/shared/application/id-generator.ts";
import { actors, identitySubjects, type authSchema } from "./drizzle-schema.ts";

export type AuthDb = DrizzleD1Database<typeof authSchema>;

export function createD1ActorProvisioner(input: {
  readonly db: AuthDb;
  readonly ids: IdGenerator;
}): ActorProvisionerPort {
  return {
    async ensureActorForSubject(request) {
      return ensureActorForSubject(input.db, input.ids, request);
    },
  };
}

export async function ensureActorForSubject(
  db: AuthDb,
  ids: IdGenerator,
  input: {
    readonly provider: IdentityProviderKey;
    readonly subject: string;
  },
): Promise<ActorId> {
  const existing = await db
    .select({ actorId: identitySubjects.actorId })
    .from(identitySubjects)
    .where(
      and(
        eq(identitySubjects.provider, input.provider),
        eq(identitySubjects.subject, input.subject),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return asActorId(existing[0].actorId);
  }

  const actorId = ids.generate();
  const now = new Date();

  await db.insert(actors).values({ id: actorId, createdAt: now });
  try {
    await db.insert(identitySubjects).values({
      provider: input.provider,
      subject: input.subject,
      actorId,
      createdAt: now,
    });
  } catch {
    // Concurrent signup: another request may have won the UNIQUE(provider, subject).
    const raced = await db
      .select({ actorId: identitySubjects.actorId })
      .from(identitySubjects)
      .where(
        and(
          eq(identitySubjects.provider, input.provider),
          eq(identitySubjects.subject, input.subject),
        ),
      )
      .limit(1);
    if (raced[0]) {
      return asActorId(raced[0].actorId);
    }
    throw new Error("identity: failed to provision actor for subject");
  }

  return asActorId(actorId);
}

export function credentialSubject(userId: string): {
  provider: typeof CREDENTIAL_IDENTITY_PROVIDER;
  subject: string;
} {
  return { provider: CREDENTIAL_IDENTITY_PROVIDER, subject: userId };
}
