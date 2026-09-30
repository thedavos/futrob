import { and, eq, sql } from "drizzle-orm";
import {
  CREDENTIAL_IDENTITY_PROVIDER,
  type ActorProvisionerPort,
  type IdentityProviderKey,
} from "@futrob/identity";
import {
  asActorId,
  type ActorId,
  type ClockPort,
  type IdGeneratorPort,
} from "@futrob/shared-kernel";
import type { AuthDb } from "./database.ts";
import { actors, identitySubjects } from "./drizzle-schema.ts";

interface SubjectRef {
  readonly provider: IdentityProviderKey;
  readonly subject: string;
}

export function createPostgresActorProvisioner(input: {
  readonly db: AuthDb;
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;
}): ActorProvisionerPort {
  return {
    async ensureActorForSubject(request) {
      return ensureActorForSubject(input.db, input.clock, input.ids, request);
    },
  };
}

export async function findActorIdForSubject(
  db: Pick<AuthDb, "select">,
  input: SubjectRef,
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

/**
 * Idempotent and race-safe: the actor and its mapping are created in one
 * transaction, serialized per subject by a transaction-scoped advisory lock so
 * concurrent sign-ins cannot mint two actors for the same subject.
 */
export async function ensureActorForSubject(
  db: AuthDb,
  clock: ClockPort,
  ids: IdGeneratorPort,
  input: SubjectRef,
): Promise<ActorId> {
  const existing = await findActorIdForSubject(db, input);
  if (existing) {
    return existing;
  }

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.provider}:${input.subject}`}, 0))`,
    );
    const raced = await findActorIdForSubject(tx, input);
    if (raced) {
      return raced;
    }

    const actorId = ids.generate();
    const now = clock.now();
    await tx.insert(actors).values({ id: actorId, createdAt: now });
    await tx.insert(identitySubjects).values({
      provider: input.provider,
      subject: input.subject,
      actorId,
      createdAt: now,
    });
    return asActorId(actorId);
  });
}

export function credentialSubject(userId: string) {
  return { provider: CREDENTIAL_IDENTITY_PROVIDER, subject: userId } satisfies {
    provider: typeof CREDENTIAL_IDENTITY_PROVIDER;
    subject: string;
  };
}
