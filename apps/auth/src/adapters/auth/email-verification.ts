import { createAuthMiddleware } from "better-auth/api";
import { z } from "zod";

/** A verification link lives one hour (Better Auth's default, stated here for the email copy). */
export const EMAIL_VERIFICATION_TTL_SECONDS = 60 * 60;

/**
 * Every account verification link lands on this web page, whichever client created the
 * account or asked to resend: the page opens in any browser, the native app included.
 */
export const EMAIL_VERIFICATION_CALLBACK = "/verify-email";

/** Code the landing page receives for a link whose account is already verified. */
export const EMAIL_VERIFICATION_LINK_USED = "TOKEN_USED";

/** The claims this worker routes on; `updateTo` marks an email change link. */
const claimsSchema = z.object({ email: z.string(), updateTo: z.string().optional() });
type VerificationClaims = z.infer<typeof claimsSchema>;

/**
 * Reads the claims of a Better Auth verification JWT without checking its signature. Only
 * routing decisions use them: Better Auth itself verifies the token before it changes anything.
 */
function readClaims(token: string): VerificationClaims | null {
  const payload = token.split(".")[1];
  if (payload === undefined) return null;
  try {
    const json = atob(payload.replaceAll("-", "+").replaceAll("_", "/"));
    const parsed = claimsSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** An email change link carries the new address; an account verification link does not. */
export function isEmailChangeToken(token: string): boolean {
  return readClaims(token)?.updateTo !== undefined;
}

/** Points an account verification link at the web landing page, whatever the client asked. */
export function withVerificationCallback(url: string): string {
  const link = new URL(url);
  link.searchParams.set("callbackURL", EMAIL_VERIFICATION_CALLBACK);
  return link.toString();
}

/**
 * Better Auth's verification links are stateless, so opening one again after the account is
 * verified would redirect as if it had just worked. Answer a reused link like a dead one:
 * it verified once, and the landing page offers another while the account still needs it.
 */
export const rejectUsedVerificationLink = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== "/verify-email") return;
  const query = z.object({ token: z.string() }).safeParse(ctx.query);
  if (!query.success) return;
  const claims = readClaims(query.data.token);
  if (claims === null || claims.updateTo !== undefined) return;
  const found = await ctx.context.internalAdapter.findUserByEmail(claims.email);
  if (!found?.user.emailVerified) return;
  throw ctx.redirect(`${EMAIL_VERIFICATION_CALLBACK}?error=${EMAIL_VERIFICATION_LINK_USED}`);
});
