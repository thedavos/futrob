import { and, count, eq, gt, like } from "drizzle-orm";
import type { AuthDb } from "./database.ts";
import { authVerifications } from "./drizzle-schema.ts";

/** A reset link lives one hour. */
export const PASSWORD_RESET_TTL_SECONDS = 60 * 60;
/** Unexpired links an account may receive; further requests answer the same and send nothing. */
export const PASSWORD_RESETS_PER_ACCOUNT = 3;

/** Better Auth stores each reset token as `reset-password:<token>` with the user id as value. */
const RESET_IDENTIFIER = "reset-password:%";

/** Unexpired reset tokens of a user, including the one just issued. Unsent tokens are deleted. */
export async function countOpenPasswordResets(
  db: Pick<AuthDb, "select">,
  userId: string,
  now: Date,
): Promise<number> {
  const [row] = await db
    .select({ open: count() })
    .from(authVerifications)
    .where(
      and(
        eq(authVerifications.value, userId),
        like(authVerifications.identifier, RESET_IDENTIFIER),
        gt(authVerifications.expiresAt, now),
      ),
    );
  return row?.open ?? 0;
}

/** Drops one token whose link was never delivered, leaving the user's other links valid. */
export async function deletePasswordReset(
  db: Pick<AuthDb, "delete">,
  token: string,
): Promise<void> {
  await db
    .delete(authVerifications)
    .where(eq(authVerifications.identifier, `reset-password:${token}`));
}

/** After a reset, older links of the same user stop working too. */
export async function deletePasswordResets(
  db: Pick<AuthDb, "delete">,
  userId: string,
): Promise<void> {
  await db
    .delete(authVerifications)
    .where(
      and(
        eq(authVerifications.value, userId),
        like(authVerifications.identifier, RESET_IDENTIFIER),
      ),
    );
}
