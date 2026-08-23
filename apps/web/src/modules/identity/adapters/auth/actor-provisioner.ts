import { and, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { CREDENTIAL_IDENTITY_PROVIDER, type IdentityProviderKey } from "@futrob/identity";
import { asActorId, type ActorId } from "@futrob/shared-kernel";
import { identitySubjects, type authSchema } from "./drizzle-schema.ts";

export type AuthDb = DrizzleD1Database<typeof authSchema>;

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

export function credentialSubject(userId: string) {
  return { provider: CREDENTIAL_IDENTITY_PROVIDER, subject: userId } satisfies {
    provider: typeof CREDENTIAL_IDENTITY_PROVIDER;
    subject: string;
  };
}
