import { and, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import {
  CREDENTIAL_IDENTITY_PROVIDER,
  type ActorProvisionerPort,
  type IdentityProviderKey,
} from "@futrob/identity";
import { asActorId, type ActorId, type IdGeneratorPort } from "@futrob/shared-kernel";
import { actors, identitySubjects, type authSchema } from "./drizzle-schema.ts";

export type AuthDb = DrizzleD1Database<typeof authSchema>;

export function createD1ActorProvisioner(input: {
  readonly db: AuthDb;
  readonly ids: IdGeneratorPort;
}): ActorProvisionerPort {
  return {
    async ensureActorForSubject(request) {
      return ensureActorForSubject(input.db, input.ids, request);
    },
  };
}

export async function findActorIdForSubject(
  db: AuthDb,
  input: {
    readonly provider: IdentityProviderKey;
    readonly subject: string;
  },
): Promise<ActorId | null> {
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

  return existing[0] ? asActorId(existing[0].actorId) : null;
}

export async function ensureActorForSubject(
  db: AuthDb,
  ids: IdGeneratorPort,
  input: {
    readonly provider: IdentityProviderKey;
    readonly subject: string;
  },
): Promise<ActorId> {
  const existing = await findActorIdForSubject(db, input);
  if (existing) {
    return existing;
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
    await db.delete(actors).where(eq(actors.id, actorId));
    const raced = await findActorIdForSubject(db, input);
    if (raced) {
      return raced;
    }
    throw new Error("identity: failed to provision actor for subject");
  }

  return asActorId(actorId);
}

export function credentialSubject(userId: string) {
  return { provider: CREDENTIAL_IDENTITY_PROVIDER, subject: userId } satisfies {
    provider: typeof CREDENTIAL_IDENTITY_PROVIDER;
    subject: string;
  };
}
