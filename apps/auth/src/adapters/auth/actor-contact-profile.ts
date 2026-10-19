import { eq, sql } from "drizzle-orm";
import type { ActorId } from "@futrob/shared-kernel";
import type { AuthDb } from "./database.ts";
import { actorContactProfiles, authUsers } from "./drizzle-schema.ts";
import { credentialSubject, findActorIdForSubject } from "./actor-provisioner.ts";

export async function upsertActorContactProfile(
  db: Pick<AuthDb, "insert">,
  input: {
    readonly actorId: ActorId;
    readonly displayName: string;
    readonly email: string;
    readonly updatedAt: Date;
  },
): Promise<void> {
  await db
    .insert(actorContactProfiles)
    .values({
      actorId: input.actorId,
      displayName: input.displayName,
      email: input.email,
      updatedAt: input.updatedAt,
    })
    .onConflictDoUpdate({
      target: actorContactProfiles.actorId,
      set: {
        displayName: input.displayName,
        email: input.email,
        updatedAt: input.updatedAt,
      },
      // A sync that read an older auth_users row must not overwrite a newer projection.
      setWhere: sql`${actorContactProfiles.updatedAt} <= excluded.updated_at`,
    });
}

export async function syncCredentialUserContact(
  db: Pick<AuthDb, "insert" | "select">,
  userId: string,
): Promise<void> {
  const actorId = await findActorIdForSubject(db, credentialSubject(userId));
  if (!actorId) return;
  const users = await db
    .select({
      name: authUsers.name,
      email: authUsers.email,
      updatedAt: authUsers.updatedAt,
    })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);
  const user = users[0];
  if (!user) return;
  await upsertActorContactProfile(db, {
    actorId,
    displayName: user.name,
    email: user.email,
    updatedAt: user.updatedAt,
  });
}
